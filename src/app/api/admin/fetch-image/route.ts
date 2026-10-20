import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { assertPublicHttpsUrl, fetchPublicImage, FetchImageError, type FetchImageErrorCode } from "../_lib/safeFetchImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERRORS: Record<FetchImageErrorCode, { status: number; message: string }> = {
  invalid_url: { status: 400, message: "Geçersiz görsel adresi." },
  blocked: { status: 400, message: "Geçersiz görsel adresi." },
  too_large: { status: 413, message: "Görsel 5 MB sınırını aşıyor." },
  bad_type: { status: 415, message: "Desteklenmeyen dosya türü (yalnızca JPEG, PNG, WebP, GIF, AVIF)." },
  upstream: { status: 502, message: "Görsel kaynağına ulaşılamadı." },
  timeout: { status: 504, message: "Görsel kaynağı zaman aşımına uğradı." },
};

function failure(code: FetchImageErrorCode, host: string) {
  console.warn(`[fetch-image] ${code} host=${host}`);
  const { status, message } = ERRORS[code];
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rawUrl = new URL(req.url).searchParams.get("url");
  if (!rawUrl) return failure("invalid_url", "-");

  let host = "-";
  try {
    host = new URL(rawUrl.trim()).host || "-";
  } catch {
    // unparsable input is rejected by assertPublicHttpsUrl below
  }

  try {
    const target = assertPublicHttpsUrl(rawUrl);
    const { buffer, contentType } = await fetchPublicImage(target.toString());

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": 'attachment; filename="image"',
      },
    });
  } catch (error) {
    return failure(error instanceof FetchImageError ? error.code : "upstream", host);
  }
}
