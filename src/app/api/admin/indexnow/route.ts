import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { submitToIndexNow } from "@/lib/indexnow";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Admin kontrolü
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

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
  } catch (error: any) {
    console.error("IndexNow Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
