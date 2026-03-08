import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";

type ChangelogEntry = {
  id: string;
  version: string;
  title: string;
  content: string | null;
  published_at: string | null;
  is_published: boolean;
};

const Changelog = () => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("changelog_entries")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setEntries(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Changelog – Peyzaj Rehberi</title>
        <meta name="description" content="Peyzaj Rehberi'ndeki yenilikler ve güncellemeler." />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              Yenilikler
            </h1>
            <div className="w-16 h-1 bg-accent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground font-body">
              Platformumuzdaki tüm güncellemeleri ve yeni özellikleri buradan takip edebilirsiniz.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Yükleniyor...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground">Henüz bir güncelleme paylaşılmadı.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden md:block" />

              <div className="space-y-8">
                {entries.map((entry, i) => (
                  <div key={entry.id} className="relative flex gap-6">
                    {/* Timeline dot */}
                    <div className="hidden md:flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"}`}>
                        <Rocket className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Content card */}
                    <div className="flex-1 bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {entry.version}
                        </Badge>
                        {entry.published_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.published_at).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {i === 0 && (
                          <Badge className="bg-accent text-accent-foreground text-xs">Yeni</Badge>
                        )}
                      </div>
                      <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
                        {entry.title}
                      </h2>
                      {entry.content && (
                        <div
                          className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
                          dangerouslySetInnerHTML={{ __html: entry.content }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Changelog;
