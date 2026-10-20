"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Cloudflare Turnstile for the lead form (create-lead rejects requests without a valid token, action "lead").
 * Invisible for almost everybody: the box only appears when Cloudflare needs an interactive check.
 * Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it renders nothing and getToken() resolves to undefined
 * (the backend then only accepts the request in its dev mode).
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_WAIT_MS = 12000;

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}
type TurnstileWindow = Window & { turnstile?: TurnstileApi };

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = (window as TurnstileWindow).turnstile;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = (window as TurnstileWindow).turnstile;
      if (api) resolve(api);
      else reject(new Error("turnstile_unavailable"));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_load_failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Resolves with a fresh token, or undefined when none could be obtained (not configured, blocked, timed out). */
  getToken: () => Promise<string | undefined>;
  /** Tokens are single use: call after every request that consumed one. */
  reset: () => void;
}

const TurnstileWidget = forwardRef<TurnstileHandle>(function TurnstileWidget(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const failedRef = useRef(false);
  const waitersRef = useRef<Array<(token: string | undefined) => void>>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!SITE_KEY || !container) return;
    let cancelled = false;
    const settle = (token: string | undefined) => {
      tokenRef.current = token ?? null;
      failedRef.current = token === undefined;
      for (const resolve of waitersRef.current.splice(0)) resolve(token);
    };
    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetIdRef.current = api.render(container, {
          sitekey: SITE_KEY,
          action: "lead",
          theme: "light",
          size: "compact",
          language: "tr",
          appearance: "interaction-only",
          callback: (token: string) => settle(token),
          "expired-callback": () => {
            tokenRef.current = null;
            if (widgetIdRef.current) api.reset(widgetIdRef.current);
          },
          "error-callback": () => settle(undefined),
        });
      })
      .catch(() => settle(undefined));
    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId) (window as TurnstileWindow).turnstile?.remove(widgetId);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getToken: () => {
      if (!SITE_KEY || failedRef.current) return Promise.resolve(undefined);
      if (tokenRef.current) return Promise.resolve(tokenRef.current);
      return new Promise<string | undefined>((resolve) => {
        const timer = window.setTimeout(() => {
          waitersRef.current = waitersRef.current.filter((waiter) => waiter !== onToken);
          resolve(undefined);
        }, TOKEN_WAIT_MS);
        const onToken = (token: string | undefined) => {
          window.clearTimeout(timer);
          resolve(token);
        };
        waitersRef.current.push(onToken);
      });
    },
    reset: () => {
      tokenRef.current = null;
      failedRef.current = false;
      const widgetId = widgetIdRef.current;
      if (widgetId) (window as TurnstileWindow).turnstile?.reset(widgetId);
    },
  }));

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center" />;
});

export default TurnstileWidget;
