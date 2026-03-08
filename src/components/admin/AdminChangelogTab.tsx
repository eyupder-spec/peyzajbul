import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

type ChangelogEntry = {
  id: string;
  version: string;
  title: string;
  content: string | null;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
};

const AdminChangelogTab = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [form, setForm] = useState({ version: "", title: "", content: "", is_published: false });
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("changelog_entries")
      .select("*")
      .order("published_at", { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ version: "", title: "", content: "", is_published: false });
    setDialogOpen(true);
  };

  const openEdit = (entry: ChangelogEntry) => {
    setEditing(entry);
    setForm({
      version: entry.version,
      title: entry.title,
      content: entry.content || "",
      is_published: entry.is_published,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.version || !form.title) {
      toast({ title: "Versiyon ve başlık zorunlu", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("changelog_entries")
          .update({
            version: form.version,
            title: form.title,
            content: form.content || null,
            is_published: form.is_published,
            published_at: form.is_published ? (editing.published_at || new Date().toISOString()) : null,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Güncellendi!" });
      } else {
        const { error } = await supabase
          .from("changelog_entries")
          .insert({
            version: form.version,
            title: form.title,
            content: form.content || null,
            is_published: form.is_published,
            published_at: form.is_published ? new Date().toISOString() : null,
          });
        if (error) throw error;
        toast({ title: "Eklendi!" });
      }
      setDialogOpen(false);
      loadEntries();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("changelog_entries").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Silindi" });
      loadEntries();
    }
  };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">Changelog Yönetimi</h2>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Kayıt
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Henüz changelog kaydı yok.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-border">
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">{entry.version}</Badge>
                    <span className="font-heading font-semibold text-foreground">{entry.title}</span>
                    {entry.is_published ? (
                      <Badge className="bg-primary text-primary-foreground text-xs">Yayında</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Taslak</Badge>
                    )}
                  </div>
                  {entry.content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.content.replace(/<[^>]*>/g, "")}</p>
                  )}
                  {entry.published_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.published_at).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Düzenle" : "Yeni Changelog Kaydı"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Versiyon *</Label>
                <Input
                  placeholder="v1.0"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_published}
                    onCheckedChange={(c) => setForm({ ...form, is_published: c })}
                  />
                  <Label>Yayınla</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>Başlık *</Label>
              <Input
                placeholder="Yeni özellikler ve iyileştirmeler"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>İçerik (HTML destekli)</Label>
              <Textarea
                rows={8}
                placeholder="• Yeni özellik eklendi&#10;• Hata düzeltildi&#10;• Performans iyileştirildi"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChangelogTab;
