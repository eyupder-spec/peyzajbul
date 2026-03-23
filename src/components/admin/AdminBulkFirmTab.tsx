import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateFirmSlug } from "@/lib/firmUtils";
import { SERVICE_LABELS } from "@/lib/categories";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Upload, Globe, Download, Trash2, Loader2, CheckCircle, XCircle, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type BulkFirmRow = {
  company_name: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  website: string;
  description: string;
  services: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  status?: "pending" | "success" | "error";
  errorMsg?: string;
};

const EMPTY_ROW: BulkFirmRow = {
  company_name: "", phone: "", email: "", city: "", district: "",
  address: "", website: "", description: "", services: "",
  instagram: "", facebook: "", twitter: "", linkedin: "", youtube: "",
};

const CSV_HEADERS = "firma_adi;telefon;email;il;ilce;adres;website;aciklama;hizmetler;instagram;facebook;twitter;linkedin;youtube";
const HEADER_MAP: Record<string, keyof BulkFirmRow> = {
  firma_adi: "company_name", firma_adı: "company_name", company_name: "company_name",
  telefon: "phone", phone: "phone",
  email: "email", eposta: "email", "e-posta": "email",
  il: "city", city: "city", sehir: "city", şehir: "city",
  ilce: "district", ilçe: "district", district: "district",
  adres: "address", address: "address",
  website: "website", web: "website",
  aciklama: "description", açıklama: "description", description: "description",
  hizmetler: "services", services: "services",
  instagram: "instagram", insta: "instagram", ig: "instagram",
  facebook: "facebook", fb: "facebook",
  twitter: "twitter", x: "twitter",
  linkedin: "linkedin",
  youtube: "youtube", yt: "youtube"
};

function parseCSV(text: string): BulkFirmRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ""));

  const mappedHeaders = headers.map(h => HEADER_MAP[h] || null);

  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
    const row: BulkFirmRow = { ...EMPTY_ROW };
    mappedHeaders.forEach((key, i) => {
      if (key && values[i]) (row as any)[key] = values[i];
    });
    return row;
  }).filter(r => r.company_name);
}

export default function AdminBulkFirmTab() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"csv" | "crawler">("csv");
  const [rows, setRows] = useState<BulkFirmRow[]>([]);
  const [urls, setUrls] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState({ done: 0, total: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "CSV boş veya hatalı", variant: "destructive" });
        return;
      }
      setRows(parsed);
      toast({ title: `${parsed.length} firma bulundu` });
    };

    // Excel'den gelen CSV'lerdeki Türkçe karakter (ş, ı, ğ, vb.) sorunu için "windows-1254" 
    reader.readAsText(file, "windows-1254");
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    // Türkçe karakterleri desteklemesi için BOM (Byte Order Mark) ekliyoruz ve charseti utf-8 tutuyoruz 
    // veya windows-1254 ile Blob oluştururken sorun yaşamamak için standart virgül ayracıyla verebiliriz.
    // Ancak daha önce FileReader'ı windows-1254 okumaya ayarladık. Şablonu UTF-8 olarak verip, Excel'de düzgün açılması için BOM koymak en garantisidir.
    const BOM = "\uFEFF";
    const csvContent = CSV_HEADERS + "\nÖrnek Peyzaj;05001234567;info@ornek.com;İstanbul;Kadıköy;Caferağa Mah;www.ornek.com;Açıklama metni;Peyzaj Mimarlığı, Bahçe Bakımı & Bahçıvanlık;peyzajornek;ornekpeyzaj;;;";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "firma-sablonu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCrawl = async () => {
    const urlList = urls.split(/\r?\n/).map(u => u.trim()).filter(Boolean);
    if (urlList.length === 0) {
      toast({ title: "En az bir URL girin", variant: "destructive" });
      return;
    }
    setCrawling(true);
    setCrawlProgress({ done: 0, total: urlList.length });
    const results: BulkFirmRow[] = [];

    for (const url of urlList) {
      try {
        const { data, error } = await supabase.functions.invoke("firecrawl-company", {
          body: { url },
        });
        if (error || !data?.success) {
          results.push({ ...EMPTY_ROW, company_name: url, status: "error", errorMsg: data?.error || error?.message || "Bilinmeyen hata" });
        } else {
          const c = data.company;
          results.push({
            company_name: c.company_name || "",
            phone: c.phone || "",
            email: c.email || "",
            city: c.city || "",
            district: c.district || "",
            address: c.address || "",
            website: url,
            description: c.description || "",
            services: Array.isArray(c.services) ? c.services.join(", ") : (c.services || ""),
            instagram: c.instagram || "",
            facebook: c.facebook || "",
            twitter: c.twitter || "",
            linkedin: c.linkedin || "",
            youtube: c.youtube || "",
          });
        }
      } catch (err: any) {
        results.push({ ...EMPTY_ROW, company_name: url, status: "error", errorMsg: err.message });
      }
      setCrawlProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }

    setRows(prev => [...prev, ...results]);
    setCrawling(false);
    toast({ title: `${results.filter(r => !r.status).length} firma çekildi, ${results.filter(r => r.status === "error").length} hata` });
  };

  const updateRow = (index: number, field: keyof BulkFirmRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value, status: undefined, errorMsg: undefined } : r));
  };

  const toggleService = (index: number, service: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const currentServices = r.services ? r.services.split(",").map(s => s.trim()).filter(Boolean) : [];
      let newServices;
      if (currentServices.includes(service)) {
        newServices = currentServices.filter(s => s !== service);
      } else {
        newServices = [...currentServices, service];
      }
      return { ...r, services: newServices.join(", "), status: undefined, errorMsg: undefined };
    }));
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkInsert = async () => {
    const validRows = rows.filter(r => r.company_name && r.phone && r.city);
    if (validRows.length === 0) {
      toast({ title: "Eklenecek geçerli firma yok", description: "Firma adı, telefon ve il zorunludur.", variant: "destructive" });
      return;
    }

    setInserting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Oturum hatası", variant: "destructive" }); setInserting(false); return; }

    let successCount = 0;
    const updatedRows = [...rows];

    for (let i = 0; i < updatedRows.length; i++) {
      const r = updatedRows[i];
      if (!r.company_name || !r.phone || !r.city) {
        updatedRows[i] = { ...r, status: "error", errorMsg: "Zorunlu alan eksik (ad, telefon, il)" };
        continue;
      }

      try {
        const servicesArr = r.services
          ? r.services.split(",").map(s => s.trim()).filter(Boolean)
          : [];

        const cleanEmail = r.email ? r.email.trim().replace(/^https?:\/\//, "") : null;

        const { data: inserted, error } = await supabase.from("firms").insert({
          user_id: user.id,
          company_name: r.company_name,
          phone: r.phone,
          email: cleanEmail,
          city: r.city,
          district: r.district || null,
          address: r.address || null,
          website: r.website || null,
          description: r.description || null,
          services: servicesArr,
          social_instagram: r.instagram || null,
          social_facebook: r.facebook || null,
          social_x: r.twitter || null,
          social_linkedin: r.linkedin || null,
          social_youtube: r.youtube || null,
          is_approved: true,
          is_active: true,
        }).select("id, company_name").single();

        if (error) throw error;

        if (inserted) {
          const slug = generateFirmSlug(inserted.company_name, inserted.id);
          await supabase.from("firms").update({ slug }).eq("id", inserted.id);
        }

        updatedRows[i] = { ...r, status: "success" };
        successCount++;
      } catch (err: any) {
        updatedRows[i] = { ...r, status: "error", errorMsg: err.message };
      }
    }

    setRows(updatedRows);
    setInserting(false);
    toast({ title: `${successCount} firma eklendi`, description: `${updatedRows.filter(r => r.status === "error").length} hata oluştu.` });
  };

  const clearAll = () => { setRows([]); setUrls(""); };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex gap-3">
        <Button variant={mode === "csv" ? "default" : "outline"} onClick={() => setMode("csv")} className="gap-2">
          <Upload className="h-4 w-4" /> CSV Yükle
        </Button>
        <Button variant={mode === "crawler" ? "default" : "outline"} onClick={() => setMode("crawler")} className="gap-2">
          <Globe className="h-4 w-4" /> URL Crawler
        </Button>
      </div>

      {/* CSV Mode */}
      {mode === "csv" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              CSV Dosyası Yükle
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1 text-xs">
                <Download className="h-3 w-3" /> Şablon İndir
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="max-w-sm"
            />
            <div className="space-y-1 mt-3">
              <p className="text-xs text-muted-foreground">
                Sütunlar: <span className="font-mono">firma_adi;telefon;email;il;ilce;adres;website;aciklama;hizmetler;instagram;facebook;twitter;linkedin;youtube</span>
              </p>
              <p className="text-xs text-muted-foreground">
                * <span className="font-semibold">Hizmetler</span> sütununa sistemdeki tam adları virgülle ayırarak yazın (Örn: <span className="italic">Peyzaj Mimarlığı, Çim Serme & Çim Bakımı</span>). Eşleşmeyenler yoksayılır.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crawler Mode */}
      {mode === "crawler" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Çoklu URL Crawler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={"https://firmasite1.com\nhttps://firmasite2.com\nhttps://firmasite3.com"}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={6}
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleCrawl} disabled={crawling} className="gap-2">
                {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                {crawling ? `Çekiliyor (${crawlProgress.done}/${crawlProgress.total})...` : "Tümünü Çek"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Önizleme — {rows.length} firma</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearAll}>Temizle</Button>
                <Button size="sm" onClick={handleBulkInsert} disabled={inserting} className="gap-2">
                  {inserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {inserting ? "Ekleniyor..." : "Tümünü Ekle"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">#</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[160px]">Firma Adı</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[120px]">Telefon</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[140px]">Email</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">İl</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">İlçe</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[160px]">Adres</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[120px]">Website</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[160px]">Açıklama</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[160px]">Hizmetler</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">Instagram</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">Facebook</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">Twitter(X)</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">LinkedIn</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium min-w-[100px]">YouTube</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Durum</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => (
                    <tr key={idx} className={row.status === "error" ? "bg-destructive/10" : row.status === "success" ? "bg-green-500/10" : "hover:bg-muted/50"}>
                      <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                      <td className="px-2 py-1">
                        <Input value={row.company_name} onChange={(e) => updateRow(idx, "company_name", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.phone} onChange={(e) => updateRow(idx, "phone", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.email} onChange={(e) => updateRow(idx, "email", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.city} onChange={(e) => updateRow(idx, "city", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.district} onChange={(e) => updateRow(idx, "district", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.address} onChange={(e) => updateRow(idx, "address", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.website} onChange={(e) => updateRow(idx, "website", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.description} onChange={(e) => updateRow(idx, "description", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full h-7 text-xs justify-between px-2 font-normal">
                              <span className="truncate">
                                {row.services ? row.services : "Hizmet Seç..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Hizmet ara..." className="h-8 text-xs" />
                              <CommandList>
                                <CommandEmpty>Hizmet bulunamadı.</CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-auto">
                                  {SERVICE_LABELS.map((service) => {
                                    const isSelected = row.services?.split(",").map(s => s.trim()).includes(service);
                                    return (
                                      <CommandItem
                                        key={service}
                                        value={service}
                                        onSelect={() => toggleService(idx, service)}
                                        className="text-xs"
                                      >
                                        <Check className={cn("mr-2 h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                                        {service}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.instagram} onChange={(e) => updateRow(idx, "instagram", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.facebook} onChange={(e) => updateRow(idx, "facebook", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.twitter} onChange={(e) => updateRow(idx, "twitter", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.linkedin} onChange={(e) => updateRow(idx, "linkedin", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input value={row.youtube} onChange={(e) => updateRow(idx, "youtube", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        {row.status === "success" && <Badge className="bg-green-600 text-[10px]">Eklendi</Badge>}
                        {row.status === "error" && (
                          <Badge variant="destructive" className="text-[10px]" title={row.errorMsg}>{row.errorMsg?.slice(0, 20) || "Hata"}</Badge>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

