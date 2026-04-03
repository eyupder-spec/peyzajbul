import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, Crown, Image, Info, ShieldAlert, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProfileCompletionCardProps {
  firm: any;
  galleryCount: number;
}

export function ProfileCompletionCard({ firm, galleryCount }: ProfileCompletionCardProps) {
  const router = useRouter();

  if (!firm) return null;

  const tasks = [
    {
      id: "premium",
      label: "Premium'a Geç (Rozet Kazan)",
      points: 20,
      completed: firm.is_premium,
      icon: <Crown className="h-4 w-4 text-amber-500" />,
      action: () => router.push("/premium"),
      actionLabel: "Yükselt",
    },
    {
      id: "basic",
      label: "Temel Bilgiler (Hakkında, Adres, Telefon)",
      points: 30,
      completed: !!(firm.phone && firm.address && firm.description),
      icon: <Info className="h-4 w-4 text-blue-500" />,
      action: () => router.push("/firma/ayarlar"),
      actionLabel: "Tamamla",
    },
    {
      id: "logo",
      label: "Firma Logosu Yükle",
      points: 20,
      completed: !!firm.logo_url,
      icon: <Image className="h-4 w-4 text-purple-500" />,
      action: () => router.push("/firma/ayarlar"),
      actionLabel: "Yükle",
    },
    {
      id: "gallery",
      label: "Galeriye En Az 3 Görsel Ekle",
      points: 20,
      completed: galleryCount >= 3,
      icon: <Sparkles className="h-4 w-4 text-emerald-500" />,
      action: () => router.push("/firma/galeri"),
      actionLabel: "Görsel Ekle",
    },
    {
      id: "social",
      label: "Sosyal Medya Hesabı Bağla",
      points: 10,
      completed: !!(firm.social_instagram || firm.social_facebook || firm.social_youtube || firm.social_x || firm.social_linkedin),
      icon: <ShieldAlert className="h-4 w-4 text-pink-500" />,
      action: () => router.push("/firma/ayarlar"),
      actionLabel: "Bağla",
    },
  ];

  const totalPoints = tasks.reduce((acc, task) => acc + (task.completed ? task.points : 0), 0);

  if (totalPoints >= 100) return null; // Eğer her şey tamamsa kartı göstermeyebiliriz (veya tebrik mesajı gösterebiliriz)

  return (
    <Card className="border-border bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 mb-8 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Profil Tamamlama Oranı
            </CardTitle>
            <CardDescription className="mt-1">
              Müşterilerin sizi seçme şansını artırmak için eksikleri tamamlayın.
            </CardDescription>
          </div>
          <div className="text-3xl font-bold font-heading text-primary">
            %{totalPoints}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Progress value={totalPoints} className="h-3 mb-6" />
        
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tasks.filter(t => !t.completed).map((task) => (
            <div 
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {task.icon}
                  <span className="font-semibold text-sm">{task.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-medium ml-6">
                  +{task.points} Puan
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={task.action} className="h-8 group">
                {task.actionLabel}
                <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
