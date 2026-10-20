/// <reference lib="deno.ns" />

/**
 * HTTP plumbing shared by the Edge Functions.
 *
 *   serveSecure(handler)   wraps Deno.serve: OPTIONS -> 204 with CORS, any method but POST -> 405,
 *                          HttpError -> {success:false,error} with its status, any other throw is logged
 *                          and answered with a generic 500 (the real message is never sent to the client).
 *                          The handler returns a Response or a plain object, which is sent as 200 JSON.
 *   readJson(req)          parses the body as a JSON object, capped at 100 kB (400 invalid, 413 too large)
 *   jsonResponse(req, body, status?)
 *
 * Required secrets are listed in auth.ts.
 */

import { HttpError } from "./auth.ts";
import { corsHeaders } from "./cors.ts";

export type JsonObject = Record<string, unknown>;

const MAX_BODY_BYTES = 100 * 1024;
const INVALID_BODY = "Geçersiz istek gövdesi.";
const BODY_TOO_LARGE = "İstek gövdesi çok büyük.";

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export async function readJson(req: Request): Promise<JsonObject> {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, BODY_TOO_LARGE);

  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, INVALID_BODY);

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, BODY_TOO_LARGE);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, INVALID_BODY);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, INVALID_BODY);
  }
  return parsed as JsonObject;
}

function withCors(req: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders(req))) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function serveSecure(
  handler: (req: Request) => Promise<Response | JsonObject> | Response | JsonObject,
): void {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }
    if (req.method !== "POST") {
      const response = jsonResponse(req, { success: false, error: "Yöntem desteklenmiyor." }, 405);
      response.headers.set("Allow", "POST, OPTIONS");
      return response;
    }

    try {
      const result = await handler(req);
      return result instanceof Response ? withCors(req, result) : jsonResponse(req, result);
    } catch (err) {
      if (err instanceof HttpError) {
        return jsonResponse(req, { success: false, error: err.message }, err.status);
      }
      console.error(err);
      return jsonResponse(req, { success: false, error: "Beklenmeyen bir hata oluştu." }, 500);
    }
  });
}
