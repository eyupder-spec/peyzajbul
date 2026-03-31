import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Globe, Check, Image as ImageIcon, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { compressAndConvertToWebP } from "@/lib/imageUtils";

interface FirmPhotoCrawlerProps {
  firmId: string;
  firmWebsite: string;
  firmName?: string;
  firmSlug?: string;
  onUploadSuccess: () => void;
  currentGalleryCount: number;
}

export default function FirmPhotoCrawler({ firmId, firmWebsite, firmName, firmSlug, onUploadSuccess, currentGalleryCount }: FirmPhotoCrawlerProps) {
  const [crawling, setCrawling] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [seoKeyword, setSeoKeyword] = useState("");

  // 1. Siteden Fotoğrafları Tara
  const handleCrawl = async () => {
    if (!firmWebsite) {
      toast.error("Firmanın web sitesi bulunmuyor.");
      return;
    }

    setCrawling(true);
    setPhotos([]);
    setSelectedPhotos(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-photos", {
        body: { url: firmWebsite },
      });

      if (error) throw error;
      
      if (data?.success && data.photos && data.photos.length > 0) {
        setPhotos(data.photos);
        // Varsayılan olarak ilk 5 fotoğrafı seçili yapalım (Kullanıcı kolaylığı)
        const initialSelected = new Set(data.photos.slice(0, 5));
        setSelectedPhotos(initialSelected as Set<string>);
        toast.success(`${data.photos.length} görsel bulundu!`);
      } else {
        toast.info("Resim bulunamadı veya site taramaya izin vermedi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Görsel tarama başarısız oldu.");
    } finally {
      setCrawling(false);
    }
  };

  const toggleSelect = (url: string) => {
    const next = new Set(selectedPhotos);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedPhotos(next);
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos));
    }
  };

  // 2. Seçili Fotoğrafları İndir, İşle, Yükle
  const handleUploadSelected = async () => {
    if (selectedPhotos.size === 0) return;
    
    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    let baseOrder = currentGalleryCount;

    // Toast'da izlemek için promise tipinde tutalım
    const promise = new Promise(async (resolve, reject) => {
      for (const url of Array.from(selectedPhotos)) {
        try {
          // A. Proxy üzerinden görseli indir
          const fetchRes = await fetch(`/api/admin/fetch-image?url=${encodeURIComponent(url)}`);
          if (!fetchRes.ok) throw new Error("Görsel indirilemedi.");
          
          const blob = await fetchRes.blob();
          
          // Blob'ı File objesine çevir (compressAndConvertToWebP fonksiyonunun bekleği tip)
          const file = new File([blob], `crawled_${Date.now()}.jpg`, { type: blob.type });

          // B. Görseli WebP formatına çevir ve sıkıştır (Kalite %80, max 1920px genişlik)
          const compressedBlob = await compressAndConvertToWebP(file, 0.8, 1920);

          // C. Supabase Storage'a Yükle (SEO Uyumlu Dosya Adı)
          const cleanName = (firmSlug || firmName || "peyzaj-firmasi")
            .toLocaleLowerCase('tr-TR')
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const storagePath = `${firmId}/${cleanName}-peyzaj-proje-fotografi-${Date.now()}-${Math.random().toString(36).substring(7, 11)}.webp`;
          
          const { error: uploadError } = await supabase.storage
            .from("firm-gallery")
            .upload(storagePath, compressedBlob, {
              contentType: "image/webp",
              cacheControl: "3600",
              upsert: false
            });

          if (uploadError) throw uploadError;

          // D. Public URL'i Al
          const { data: { publicUrl } } = supabase.storage.from("firm-gallery").getPublicUrl(storagePath);

          // E. Veritabanına Ekle
          const idx = successCount + 1;
          const finalCaption = seoKeyword.trim() 
            ? `${firmName || 'Firma'} - ${seoKeyword.trim()} ${idx}`
            : `${firmName || 'Firma'} Peyzaj ve Bahçe Tasarımı ${idx}`;

          const { error: dbError } = await supabase.from("firm_gallery").insert({
            firm_id: firmId,
            image_url: publicUrl,
            caption: finalCaption,
            sort_order: baseOrder++,
          });

          if (dbError) throw dbError;

          successCount++;
        } catch (error) {
          console.error("Görsel işleme/yükleme hatası:", url, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        resolve(`${successCount} görsel yüklendi. ${failCount > 0 ? `(${failCount} başarısız)` : ''}`);
      } else {
        reject(new Error(`Görseller yüklenemedi. (${failCount} başarısız)`));
      }
    });

    toast.promise(promise, {
      loading: "Seçili görseller işleniyor ve yükleniyor...",
      success: (msg) => {
        setPhotos([]);
        setSelectedPhotos(new Set());
        setSeoKeyword("");
        onUploadSuccess();
        return msg as string;
      },
      error: (err: any) => err.message,
    });

    try {
      await promise;
    } finally {
      setUploading(false);
    }
  };

  if (!firmWebsite) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 border border-dashed border-border text-center">
        <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">Otomatik fotoğraf tarama için firmanın web sitesi adresi girilmiş olmalıdır.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4 mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-medium text-foreground">
            <Globe className="h-4 w-4 text-primary" /> Web Sitesinden Fotoğraf Bul
          </h4>
          <p className="text-xs text-muted-foreground mt-1">Firmanın web sitesini yapay zeka ile tarayarak uygun galeri görsellerini bulur.</p>
        </div>
        <Button 
          onClick={handleCrawl} 
          disabled={crawling || uploading}
          variant="secondary"
          className="shrink-0"
        >
          {crawling ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Taranıyor...</>
          ) : (
            <>Siteyi Tara</>
          )}
        </Button>
      </div>

      {photos.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{photos.length} Görsel Bulundu</p>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Genel Açıklama/Konu (örn: Villa Bahçesi)"
                value={seoKeyword}
                onChange={(e) => setSeoKeyword(e.target.value)}
                className="h-8 text-xs w-56"
              />
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-8 px-2">
                {selectedPhotos.size === photos.length ? "Seçimi Temizle" : "Tümünü Seç"}
              </Button>
              <Button 
                onClick={handleUploadSelected} 
                className="h-8 text-xs px-3" 
                disabled={selectedPhotos.size === 0 || uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <DownloadCloud className="h-3 w-3 mr-1" />
                )}
                Seçilileri Yükle ({selectedPhotos.size})
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
            {photos.map((url, i) => {
              const selected = selectedPhotos.has(url);
              return (
                <div 
                  key={i} 
                  className={`relative cursor-pointer group rounded-md overflow-hidden border-2 transition-all aspect-square ${selected ? 'border-primary shadow-sm' : 'border-transparent'}`}
                  onClick={() => toggleSelect(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Scrapped ${i}`} className={`w-full h-full object-cover transition-transform ${selected ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100'}`} />
                  
                  <div className={`absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center border transition-colors ${selected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background/80 border-muted-foreground/50 text-transparent group-hover:border-primary/50'}`}>
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
