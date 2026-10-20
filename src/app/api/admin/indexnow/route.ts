import { NextResponse } from "next/server";
import { submitToIndexNow } from "@/lib/indexnow";
import { requireAdmin } from "../_lib/requireAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    // Son 7 günde güncellenen veya eklenen içerikleri çek
    const [firms, plants, materials, blog] = await Promise.all([
      supabase.from("firms").select("slug").eq("is_approved", true).gte("created_at", dateStr),
      supabase.from("plants").select("slug").eq("is_published", true).gte("created_at", dateStr),
      supabase.from("materials").select("slug").eq("is_published", true).gte("created_at", dateStr),
      supabase.from("blog_posts").select("slug").eq("status", "published").gte("created_at", dateStr),
    ]);

    const urlList: string[] = [];
    const baseUrl = "https://www.peyzajbul.com";

    firms.data?.forEach(f => urlList.push(`${baseUrl}/firma/${f.slug}`));
    plants.data?.forEach(p => urlList.push(`${baseUrl}/bitkiler/${p.slug}`));
    materials.data?.forEach(m => urlList.push(`${baseUrl}/malzemeler/${m.slug}`));
    blog.data?.forEach(b => urlList.push(`${baseUrl}/blog/${b.slug}`));

    // Ana sayfayı ve ana listeleri her zaman ekle (güncellenmiş sayılırlar)
    urlList.push(`${baseUrl}/`);
    urlList.push(`${baseUrl}/bitkiler`);
    urlList.push(`${baseUrl}/malzemeler`);
    urlList.push(`${baseUrl}/blog`);

    if (urlList.length > 0) {
      const success = await submitToIndexNow(urlList);
      if (success) {
        return NextResponse.json({ success: true, count: urlList.length });
      } else {
        return NextResponse.json({ error: "IndexNow API hatası" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: 0, message: "Yeni içerik bulunamadı" });
  } catch (error) {
    console.error("IndexNow Route Error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
