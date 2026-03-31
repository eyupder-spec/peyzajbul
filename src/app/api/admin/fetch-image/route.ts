import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Görsel URL gereklidir." }, { status: 400 });
  }

  try {
    const response = await fetch(url.trim(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error("Görsel indirilemedi: " + response.statusText);
    }

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        // Allow anything from the local origins to access this (although Next API is same-origin)
        "Access-Control-Allow-Origin": "*"
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Görsel işlenemedi." }, { status: 500 });
  }
}
