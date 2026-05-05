import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { compressAndConvertToWebP } from "@/lib/imageUtils";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import BlogEditor from "./BlogEditor";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  cover_image_alt?: string | null;
  category_slug: string | null;
  city_slug: string | null;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const AdminBlogTab = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [authorName, setAuthorName] = useState("Peyzaj Rehberi");
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const resetForm = () => {
    setTitle(""); setSlug(""); setExcerpt(""); setContent("");
    setCoverUrl(""); setCoverAlt(""); setCategorySlug(""); setCitySlug("");
    setAuthorName("Peyzajbul"); setEditingPost(null); setIsSlugManuallyEdited(false);
  };

  const openNew = () => { resetForm(); setFormOpen(true); };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || "");
    setContent(post.content || "");
    setCoverUrl(post.cover_image_url || "");
    setCoverAlt(post.cover_image_alt || "");
    setCategorySlug(post.category_slug || "");
    setCitySlug(post.city_slug || "");
    setAuthorName(post.author_name);
    setIsSlugManuallyEdited(true);
    setFormOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost && !isSlugManuallyEdited) setSlug(generateSlug(val));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const ext = "webp";
      const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g, "-").toLowerCase();
      const fileName = `${originalName}-${Date.now()}.${ext}`;
      const path = `covers/${fileName}`;

      // Görseli WebP'ye dönüştür ve sıkıştır
      const optimizedBlob = await compressAndConvertToWebP(file);
      const optimizedFile = new File([optimizedBlob], fileName, { type: "image/webp" });

      const { error } = await supabase.storage.from("blog-images").upload(path, optimizedFile);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(path);
      setCoverUrl(publicUrl);
    } catch {
      toast({ title: "Kapak görseli yüklenemedi", variant: "destructive" });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!title || !slug) {
      toast({ title: "Başlık ve slug zorunludur", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const postData = {
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        cover_image_url: coverUrl || null,
        cover_image_alt: coverAlt || null,
        category_slug: categorySlug || null,
        city_slug: citySlug || null,
        author_name: authorName,
        is_published: publish,
        published_at: publish ? (editingPost?.published_at || new Date().toISOString()) : (editingPost?.published_at || null),
      };

      if (editingPost) {
        const { error } = await supabase.from("blog_posts").update(postData).eq("id", editingPost.id);
        if (error) throw error;
        toast({ title: "Yazı güncellendi!" });
      } else {
        const { error } = await supabase.from("blog_posts").insert(postData);
        if (error) throw error;
        toast({ title: publish ? "Yazı yayınlandı!" : "Taslak kaydedildi!" });
      }
      setFormOpen(false);
      resetForm();
      loadPosts();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const newPublished = !post.is_published;
    await supabase.from("blog_posts").update({
      is_published: newPublished,
      published_at: newPublished ? (post.published_at || new Date().toISOString()) : post.published_at,
    }).eq("id", post.id);
    toast({ title: newPublished ? "Yayınlandı" : "Taslağa alındı" });
    loadPosts();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu yazıyı silmek istediğinize emin misiniz?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Yazı silindi" });
    loadPosts();
  };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{posts.length} yazı</p>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Yeni Yazı</Button>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Başlık</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Hizmet Alanı</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Şehir</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Durum</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tarih</th>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-muted/50">
                <td className="px-3 py-2 text-foreground font-medium max-w-[250px] truncate">{post.title}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {CATEGORIES.find(c => c.slug === post.category_slug)?.label || "-"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {CITIES.find(c => c.slug === post.city_slug)?.name || "-"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={post.is_published ? "default" : "secondary"}>
                    {post.is_published ? "Yayında" : "Taslak"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(post)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleTogglePublish(post)}>
                      {post.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Henüz blog yazısı yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Blog Form Dialog */}
      <Dialog open={formOpen} onOpenChange={() => { setFormOpen(false); resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Yazıyı Düzenle" : "Yeni Blog Yazısı"}</DialogTitle>
            <DialogDescription className="sr-only">
              Blog yazısı başlığı, özet, kategori, şehir ve ana metin içeriğini yönetin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Başlık (H1 ve SEO Meta Title) *</Label>
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Bahçe bakımında 10 altın kural" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <div className="flex items-center gap-2">
                  <Input value={slug} onChange={(e) => { setSlug(e.target.value); setIsSlugManuallyEdited(true); }} placeholder="bahce-bakiminda-10-altin-kural" className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setIsSlugManuallyEdited(false); setSlug(generateSlug(title)); }} title="Başlıktan otomatik oluştur" disabled={!isSlugManuallyEdited && !editingPost}>Yenile</Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Kısa Özet (SEO Meta Description)</Label>
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Google arama sonuçlarında çıkacak 1-2 cümlelik özet açıklama..." rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Hizmet Alanı</Label>
                <Select value={categorySlug || "none"} onValueChange={(v) => setCategorySlug(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Şehir</Label>
                <Select value={citySlug || "none"} onValueChange={(v) => setCitySlug(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    {CITIES.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Yazar</Label>
                <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Kapak Görseli</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    <Button asChild variant="outline" disabled={coverUploading}>
                      <span>{coverUploading ? "Yükleniyor..." : "Görsel Yükle"}</span>
                    </Button>
                  </label>
                  {coverUrl && (
                    <img src={coverUrl} alt="Kapak" className="h-16 rounded border border-border object-cover" />
                  )}
                </div>
                {coverUrl && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Görsel Alt Metni (SEO için önerilir)</Label>
                    <Input
                      value={coverAlt}
                      onChange={(e) => setCoverAlt(e.target.value)}
                      placeholder="Örn: Modern bahçe tasarımı örneği"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>İçerik</Label>
              <BlogEditor content={content} onChange={setContent} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>İptal</Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
              Taslak Kaydet
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Yayınla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlogTab;

