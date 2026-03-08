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
  project_size: string;
  phone: string;
}) => {
  const breakdown: { label: string; points: number }[] = [];

  // Budget
  switch (lead.budget) {
    case "100.000 ₺ üzeri": breakdown.push({ label: "Bütçe: 100k+ ₺", points: 30 }); break;
    case "30.000 – 100.000 ₺": breakdown.push({ label: "Bütçe: 30k–100k ₺", points: 20 }); break;
    case "10.000 – 30.000 ₺": breakdown.push({ label: "Bütçe: 10k–30k ₺", points: 10 }); break;
    default: breakdown.push({ label: "Bütçe: 10k altı", points: 0 });
  }

  // Timeline
  switch (lead.timeline) {
    case "Hemen (1–2 hafta)": breakdown.push({ label: "Zaman: Hemen", points: 25 }); break;
    case "1 ay içinde": breakdown.push({ label: "Zaman: 1 ay", points: 15 }); break;
    case "3 ay içinde": breakdown.push({ label: "Zaman: 3 ay", points: 5 }); break;
    default: breakdown.push({ label: "Zaman: Araştırma", points: 0 });
  }

  // Project size
  switch (lead.project_size) {
    case "1000 m² üzeri": breakdown.push({ label: "Alan: 1000m²+", points: 20 }); break;
    case "500–1000 m²": breakdown.push({ label: "Alan: 500–1000m²", points: 15 }); break;
    case "100–500 m²": breakdown.push({ label: "Alan: 100–500m²", points: 10 }); break;
    default: breakdown.push({ label: "Alan: 0–100m²", points: 5 });
  }

  // Email verified
  breakdown.push({ label: "E-posta doğrulandı", points: 10 });

  // Phone
  if (lead.phone) {
    breakdown.push({ label: "Telefon doğrulandı", points: 15 });
  }

  return breakdown;
};
