import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Trash2, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const FirmaGaleri = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [firm, setFirm] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [caption, setCaption] = useState("");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    const { data: firmData } = await supabase
      .from("firms")
      .select("id, is_premium, company_name")
      .eq("user_id", user.id)
      .single();

    if (!firmData) { navigate("/firma/panel"); return; }
    if (!firmData.is_premium) { navigate("/firma/premium"); return; }

    setFirm(firmData);

    const { data: galleryData } = await supabase
      .from("firm_gallery")
      .select("*")
      .eq("firm_id", firmData.id)
      .order("sort_order", { ascending: true });

    setGallery(galleryData || []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firm) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${firm.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("firm-gallery")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("firm-gallery")
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("firm_gallery")
        .insert({
          firm_id: firm.id,
          image_url: publicUrl,
          caption: caption || null,
          sort_order: gallery.length,
        });

      if (insertError) throw insertError;

      toast.success("Fotoğraf eklendi!");
      setCaption("");
      loadData();
    } catch (err) {
      toast.error("Yükleme başarısız.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    try {
      // Extract path from URL
      const urlParts = imageUrl.split("/firm-gallery/");
      if (urlParts[1]) {
        await supabase.storage.from("firm-gallery").remove([urlParts[1]]);
      }
      await supabase.from("firm_gallery").delete().eq("id", id);
      toast.success("Fotoğraf silindi.");
      loadData();
    } catch {
      toast.error("Silme başarısız.");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/firma/panel")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-heading text-2xl font-bold text-foreground">Galeri Yönetimi</h1>
          </div>

          {/* Upload */}
          <Card className="mb-8 border-border">
            <CardContent className="p-6">
              <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" /> Yeni Fotoğraf Ekle
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Açıklama (opsiyonel)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button asChild disabled={uploading}>
                    <span>{uploading ? "Yükleniyor..." : "Fotoğraf Seç"}</span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Grid */}
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.map((img) => (
                <div key={img.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-border">
                  <img
                    src={img.image_url}
                    alt={img.caption || "Galeri"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(img.id, img.image_url)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Sil
                    </Button>
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Henüz fotoğraf eklenmemiş.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FirmaGaleri;
