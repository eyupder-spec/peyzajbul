"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Send, Upload, X, Camera, Download, LayoutTemplate, ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

const gardenTypes = [
  "Arka Bahçe", "Ön Bahçe", "Yan Bahçe", "Teras/Balkon", 
  "Çatı Bahçesi", "Villa Bahçesi", "Havuzlu Bahçe", 
  "Ticari/Ofis Bahçesi", "Kamu Alanı/Park"
];

const designModes = [
  "Güzel Yeniden Tasarım", 
  "Yaratıcı Yeniden Tasarım"
];

const designStyles = [
  "Modern", "Minimalist", "Doğal/İngiliz", "Akdeniz", "Japon/Zen", 
  "Rustik", "Tropikal", "Provence/Fransız", "Geometrik/Formal", 
  "Vahşi/Doğal Çayır", "Art Deco", "Endüstriyel", "Boho", 
  "Kır Evi", "Xeriscape", "Çöl/Kaktüs", "Orman Banyosu", 
  "Rengarenk/Çiçekli", "Kayalık/Taş Bahçe", "Su Öğeli", 
  "Gizli Bahçe", "Çocuk Dostu"
];

const aiLevelLabels = ["Çok Düşük", "Düşük", "Orta", "Yüksek"];
const aiLevelDescriptions = [
  "Mevcut yapıya sadık kalarak çok az değişiklik",
  "Temel düzenlemeler ve bitki yenileme önerileri",
  "Kapsamlı yeniden tasarım ve konsept değişikliği",
  "Tam radikal dönüşüm, her unsur yeniden kurgulanır"
];

const formSchema = z.object({
  tip: z.string().min(1, "Bahçe tipi seçiniz"),
  mod: z.string().min(1, "Mod seçiniz"),
  stil: z.string().min(1, "Tasarım stili seçiniz"),
  adet: z.number().min(1).max(4),
  aiSeviye: z.number().min(0).max(3),
  ozelTalimatVar: z.boolean().default(false),
  ozelTalimat: z.string().optional(),
  foto: z.string().min(1, "Mevcut bahçenizin fotoğrafını yüklemelisiniz"),
  guvenlikCevabi: z.string().min(1, "Güvenlik sorusunu yanıtlayın"),
});

export default function AIBahceOlusturucu() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; images: string[] } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Security Challenge State
  const [challenge, setChallenge] = useState({ num1: 0, num2: 0, sum: 0 });

  const generateChallenge = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setChallenge({ num1, num2, sum: num1 + num2 });
  };

  useEffect(() => {
    generateChallenge();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tip: "",
      mod: "",
      stil: "",
      adet: 1,
      aiSeviye: 1,
      ozelTalimatVar: false,
      ozelTalimat: "",
      foto: "",
      guvenlikCevabi: "",
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error("Dosya boyutu 4MB'dan küçük olmalıdır.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        form.setValue("foto", base64);
        form.clearErrors("foto");
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Basic bot protection check
    if (parseInt(values.guvenlikCevabi) !== challenge.sum) {
      toast.error("Güvenlik sorusunu yanlış yanıtladınız.");
      form.setError("guvenlikCevabi", { message: "Hatalı yanıt" });
      generateChallenge();
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("gemini-nanobanana", {
        body: {
          tip: values.tip,
          mod: values.mod,
          stil: values.stil,
          adet: values.adet,
          aiSeviye: values.aiSeviye,
          aiEtiket: aiLevelLabels[values.aiSeviye],
          aiAciklama: aiLevelDescriptions[values.aiSeviye],
          ozelTalimat: values.ozelTalimatVar ? values.ozelTalimat : null,
          foto: values.foto,
        },
      });

      if (error) throw error;
      
      setResult({
        content: data?.content || "Tasarım başarıyla oluşturuldu.",
        images: data?.images || []
      });
      
      toast.success("Tasarım ve görseller başarıyla oluşturuldu!");
      generateChallenge(); // Reset for next use
      form.setValue("guvenlikCevabi", "");
      
      setTimeout(() => {
        document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      toast.error("Tasarım oluşturulurken bir hata oluştu.");
      setResult({ 
        content: "❌ Bir hata oluştu. Lütfen bağlantınızı kontrol edin ve tekrar deneyiniz.", 
        images: [] 
      });
    } finally {
      setLoading(false);
    }
  }

  const downloadImage = (base64: string, index: number) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = `bahce-tasarimi-${index + 1}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="font-semibold text-xs uppercase tracking-widest">Görsel Destekli AI Peyzaj Mimarı</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-primary mb-4 font-heading">
              Hayalindeki Bahçeyi <span className="text-accent underline decoration-accent/30 decoration-4 underline-offset-8">Fotoğrafla Dönüştür</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Mevcut alanınızın fotoğrafını yükleyin, AI ile fotogerçekçi yeni tasarımlar hazırlayalım.
            </p>
          </div>

          <Card className="bg-card border-border p-6 md:p-10 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 relative z-10">
                {/* Photo Upload Section */}
                <div className="space-y-4">
                  <FormLabel className={`text-base font-semibold flex items-center gap-2 ${form.formState.errors.foto ? "text-destructive" : ""}`}>
                    <Camera className="w-4 h-4 text-accent" />
                    Mevcut Bahçenizin Fotoğrafı (Zorunlu)
                  </FormLabel>
                  <div className="relative">
                    {!preview ? (
                      <label 
                        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-muted/30 transition-all group ${
                          form.formState.errors.foto ? "border-destructive/50 bg-destructive/5" : "border-muted"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className={`p-3 rounded-full mb-3 group-hover:scale-110 transition-transform ${
                            form.formState.errors.foto ? "bg-destructive/10" : "bg-primary/10"
                          }`}>
                            <Upload className={`w-6 h-6 ${form.formState.errors.foto ? "text-destructive" : "text-primary"}`} />
                          </div>
                          <p className="mb-1 text-sm text-foreground font-medium">Fotoğraf Yüklemek İçin Tıklayın</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG veya WEBP (Max. 4MB)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    ) : (
                      <div className="relative w-full h-64 rounded-2xl overflow-hidden group border-2 border-primary/20">
                        <Image 
                          src={preview} 
                          alt="Önizleme" 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        <button
                          type="button"
                          onClick={() => { setPreview(null); form.setValue("foto", ""); }}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {form.formState.errors.foto && (
                      <p className="text-xs text-destructive mt-2">{form.formState.errors.foto.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="tip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">Bahçe Tipi</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl focus:ring-accent bg-background border-input">
                              <SelectValue placeholder="Alan tipini belirleyin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover text-popover-foreground">
                            {gardenTypes.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">Mod</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl focus:ring-accent bg-background border-input">
                              <SelectValue placeholder="Dönüşüm şiddeti" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover text-popover-foreground">
                            {designModes.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stil"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="font-semibold text-foreground">Tasarım Stili</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl focus:ring-accent bg-background border-input">
                              <SelectValue placeholder="Hayalinizdeki stili seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] bg-popover text-popover-foreground">
                            {designStyles.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="adet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">Kaç Farklı Tasarım Görseli?</FormLabel>
                        <div className="grid grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map((n) => (
                            <Button
                              key={n}
                              type="button"
                              variant={field.value === n ? "default" : "outline"}
                              className={`h-12 rounded-xl text-lg font-bold transition-all ${
                                field.value === n 
                                  ? "bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20 scale-[1.02]" 
                                  : "bg-muted/50 hover:bg-muted text-foreground"
                              }`}
                              onClick={() => field.onChange(n)}
                            >
                              {n}
                            </Button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aiSeviye"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex justify-between font-semibold mb-2 text-foreground">
                          <span>AI Müdahalesi / Radikallik</span>
                          <span className="text-accent">{aiLevelLabels[field.value]}</span>
                        </FormLabel>
                        <FormControl>
                          <div className="px-2">
                            <Slider
                              min={0}
                              max={3}
                              step={1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="[&_[role=slider]]:bg-accent py-4"
                            />
                            <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-medium">
                              {aiLevelLabels.map((l) => (
                                <span key={l}>{l}</span>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-3 italic border-l-2 border-accent/20 pl-3">
                          {aiLevelDescriptions[field.value]}
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ozelTalimatVar"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-muted p-5 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold cursor-pointer text-foreground">Özel Talimat Ekle</FormLabel>
                          <p className="text-sm text-muted-foreground">Spesifik bitki veya detay istekleriniz var mı?</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-accent"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("ozelTalimatVar") && (
                    <FormField
                      control={form.control}
                      name="ozelTalimat"
                      render={({ field }) => (
                        <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <FormControl>
                            <Textarea
                              placeholder="Örn: Akşam aydınlatması ön planda olsun, az su isteyen bitkiler seçilsin..."
                              className="min-h-[100px] rounded-xl focus:ring-accent bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Simple Security Challenge */}
                <div className="pt-6 border-t border-muted">
                    <FormField
                      control={form.control}
                      name="guvenlikCevabi"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <FormLabel className="flex items-center gap-2 text-foreground font-semibold shrink-0 min-w-[140px]">
                              <ShieldCheck className="w-4 h-4 text-accent" />
                              Güvenlik Sorusu:
                            </FormLabel>
                            
                            <div className="flex items-center gap-3 flex-1 max-w-md">
                              <div className="bg-muted px-4 py-2 rounded-xl font-mono text-lg font-bold select-none whitespace-nowrap">
                                {challenge.num1} + {challenge.num2} = ?
                              </div>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Yanıt" 
                                  className="h-11 w-24 rounded-xl text-center font-bold text-lg focus:ring-accent bg-background"
                                  {...field}
                                />
                              </FormControl>
                              <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={generateChallenge}
                                  className="text-muted-foreground hover:text-accent shrink-0"
                              >
                                  <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="hidden md:block text-xs text-muted-foreground italic">
                              Bot korumasını doğrula
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <Button
                  type="submit"
                  className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all duration-300 shadow-xl shadow-primary/10 group overflow-hidden relative"
                  disabled={loading}
                >
                  <div className={`absolute inset-0 bg-accent transition-transform duration-500 translate-y-full group-hover:translate-y-0 h-full w-full -z-10`} />
                  {loading ? (
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Görseller Hazırlanıyor...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <LayoutTemplate className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Bahçe Tasarımını Oluştur</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </Card>

          <div id="result-area" className="mt-12">
            {loading && (
              <div className="flex flex-col items-center justify-center p-16 space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/10 border-t-accent rounded-full animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-accent animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-primary font-semibold text-lg">Yapay Zeka Tasarımları Çiziyor</p>
                  <p className="text-muted-foreground animate-pulse">Lütfen bekleyin, görsellerin oluşturulması 10-20 saniye sürebilir...</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Generated Images Grid */}
                {result?.images && result.images.length > 0 && (
                  <div className={`grid grid-cols-1 ${result.images.length > 1 ? 'md:grid-cols-2' : ''} gap-6`}>
                    {result.images.map((img, idx) => (
                      <Card key={idx} className="bg-card border-accent/20 overflow-hidden shadow-2xl group flex flex-col">
                        <div className="relative aspect-video">
                          <Image 
                            src={`data:image/png;base64,${img}`} 
                            alt={`Tasarım ${idx + 1}`} 
                            fill 
                            className="object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-white/90 hover:bg-white text-black"
                              onClick={() => downloadImage(img, idx)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              İndir
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 bg-primary/5 border-t border-accent/10">
                          <p className="text-sm font-bold text-primary flex items-center">
                            <Sparkles className="w-3 h-3 mr-2 text-accent" />
                            AI Tasarım #{idx + 1}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* AI Text Analysis */}
                <Card className="bg-card border-accent/20 p-6 md:p-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-accent" />
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-primary flex items-center font-heading">
                      <Sparkles className="w-6 h-6 mr-3 text-accent" />
                      Tasarım Detayları ve Açıklamalar
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-muted-foreground hover:text-primary">
                      Yazdır
                    </Button>
                  </div>
                  
                  <div className="prose prose-stone max-w-none">
                    <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans text-lg">
                      {result?.content}
                    </div>
                  </div>

                  <div className="mt-16 p-8 rounded-2xl bg-primary/5 border border-primary/10 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <p className="text-primary font-bold text-xl mb-3 relative z-10">
                      Bu tasarımı hayata geçirmek ister misiniz?
                    </p>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto relative z-10 text-sm">
                      Profesyonel peyzaj firmalarıyla iletişime geçerek bu konseptleri gerçeğe dönüştürebilirsiniz.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                      <Button 
                        className="bg-accent hover:bg-accent/90 text-white rounded-xl px-8 h-12 shadow-lg shadow-accent/20"
                        onClick={() => window.location.href = '/firmalar'}
                      >
                        Peyzaj Firmalarını İncele
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/5 rounded-xl px-8 h-12"
                        onClick={() => window.location.href = '/isletme-ekle'}
                      >
                        Ücretsiz Teklif Al
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
