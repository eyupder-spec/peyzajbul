"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LAST_LEAD_KEY = "pz_last_lead";

/** Sends the visitor to the status page of the lead submitted in this tab, or back to the form. */
export default function LegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    let target = "/teklif-al";
    try {
      const stored: unknown = JSON.parse(window.sessionStorage.getItem(LAST_LEAD_KEY) ?? "null");
      if (typeof stored === "object" && stored !== null) {
        const { id, token } = stored as { id?: unknown; token?: unknown };
        if (typeof id === "string" && id && typeof token === "string" && token) {
          target = `/talep/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
        }
      }
    } catch {
      // Nothing stored or storage blocked: the form is the right place anyway.
    }
    router.replace(target);
  }, [router]);

  return (
    <p role="status" className="text-sm text-muted-foreground">
      Yönlendiriliyor…
    </p>
  );
}
