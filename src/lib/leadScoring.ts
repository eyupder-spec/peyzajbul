export type ScoreBadge = {
  label: string;
  emoji: string;
  className: string;
};

export const getScoreBadge = (score: number | null): ScoreBadge => {
  const s = score || 0;
  if (s >= 80) return { label: "Sıcak Lead", emoji: "🔥", className: "bg-destructive/20 text-destructive" };
  if (s >= 50) return { label: "İyi Lead", emoji: "⭐", className: "bg-accent/20 text-accent-foreground" };
  if (s >= 20) return { label: "Orta Lead", emoji: "🌱", className: "bg-primary/20 text-primary" };
  return { label: "Soğuk Lead", emoji: "❄️", className: "bg-muted text-muted-foreground" };
};

export const getScoreBreakdown = (lead: {
  budget: string;
  timeline: string;
  project_size?: string | null;
  area_size?: string | null;
  project_type?: string | null;
  phone: string;
}) => {
  const breakdown: { label: string; points: number }[] = [];

  // Project type
  if (lead.project_type === "commercial") {
    breakdown.push({ label: "Ticari proje", points: 10 });
  }

  // Budget
  switch (lead.budget) {
    case "200000+": case "2000000+": breakdown.push({ label: "Bütçe: Yüksek", points: 30 }); break;
    case "75000-200000": case "750000-2000000": breakdown.push({ label: "Bütçe: Orta-Yüksek", points: 25 }); break;
    case "25000-75000": case "250000-750000": breakdown.push({ label: "Bütçe: Orta", points: 15 }); break;
    case "25000-alti": case "250000-alti": breakdown.push({ label: "Bütçe: Düşük", points: 5 }); break;
    default: breakdown.push({ label: "Bütçe: Belirsiz", points: 0 });
  }

  // Timeline
  switch (lead.timeline) {
    case "hemen": breakdown.push({ label: "Zaman: Hemen", points: 25 }); break;
    case "1-ay": breakdown.push({ label: "Zaman: 1 ay", points: 20 }); break;
    case "1-3-ay": breakdown.push({ label: "Zaman: 1–3 ay", points: 10 }); break;
    case "3-6-ay": breakdown.push({ label: "Zaman: 3–6 ay", points: 5 }); break;
    default: breakdown.push({ label: "Zaman: Araştırma", points: 0 });
  }

  // Area size
  const size = lead.area_size || lead.project_size;
  switch (size) {
    case "1000+": case "20000+": breakdown.push({ label: "Alan: Büyük", points: 20 }); break;
    case "500-1000": case "5000-20000": breakdown.push({ label: "Alan: Orta-Büyük", points: 15 }); break;
    case "150-500": case "1000-5000": breakdown.push({ label: "Alan: Orta", points: 10 }); break;
    default: breakdown.push({ label: "Alan: Küçük", points: 5 });
  }

  // Email verified
  breakdown.push({ label: "E-posta doğrulandı", points: 10 });

  // Phone
  if (lead.phone) {
    breakdown.push({ label: "Telefon mevcut", points: 5 });
  }

  return breakdown;
};
