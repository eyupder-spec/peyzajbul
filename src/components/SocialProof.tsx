"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Star, User, MapPin, X } from "lucide-react";

// Mock veriler. Ne kadar çeşitli olursa o kadar gerçekçi durur.
const SOCIAL_PROOF_EVENTS = [
  {
    type: "lead",
    title: "Yeni Teklif Talebi",
    desc: "Ahmet B. 450m² Villa Bahçesi Tasarımı için teklif istedi.",
    location: "İstanbul, Beykoz",
    icon: User,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    type: "lead",
    title: "Yeni Teklif Talebi",
    desc: "Zeynep K. otomatik sulama sistemi kurulumu arıyor.",
    location: "İzmir, Çeşme",
    icon: User,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    type: "premium",
    title: "Premium Üyelik",
    desc: "Doğa Mimarlık Peyzaj Premium Plana geçiş yaptı.",
    location: "Antalya, Muratpaşa",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-100",
  },
  {
    type: "firm_signup",
    title: "Yeni İşletme",
    desc: "Yeşil Yaşam Peyzaj rehbere katıldı.",
    location: "Ankara, Çankaya",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-100",
  },
  {
    type: "lead",
    title: "Yeni Teklif Talebi",
    desc: "Rulo çim serimi ve periyodik bakım için talep oluşturuldu.",
    location: "Muğla, Bodrum",
    icon: User,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    type: "premium",
    title: "Premium Üyelik",
    desc: "Elite Bahçe Tasarım Premium Plana geçiş yaptı.",
    location: "İstanbul, Sarıyer",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-100",
  }
];

export const SocialProof = () => {
  const [currentEvent, setCurrentEvent] = useState<typeof SOCIAL_PROOF_EVENTS[0] | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Eğer kullanıcı manuel olarak kapattıysa session boyunca bir daha göstermeyebiliriz 
    // ama şimdilik sadece mevcut döngüyü iptal etmeyip sadece gizlenmesine izin verelim.
    // Yine de sinir bozucu olmaması için gösterim aralığını ayarlarız.
    
    const triggerNextEvent = () => {
      // Pick random event
      const randomEvent = SOCIAL_PROOF_EVENTS[Math.floor(Math.random() * SOCIAL_PROOF_EVENTS.length)];
      setCurrentEvent(randomEvent);
      setIsVisible(true);

      // Hide after 6 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 6000);
    };

    // İlk bildirim 15 saniye sonra çıksın
    const initialTimer = setTimeout(() => {
      if (!isDismissed) triggerNextEvent();
    }, 15000);

    // Sonraki bildirimler her 30-45 saniyede bir (ortalama) çıksın
    const intervalTimer = setInterval(() => {
      if (!isDismissed) triggerNextEvent();
    }, 45000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [isDismissed]);

  if (!currentEvent) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 transform ${
        isVisible && !isDismissed
          ? "translate-y-0 opacity-100 pointer-events-auto" 
          : "translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 pr-10 max-w-[320px] relative overflow-hidden">
        {/* Glow animasyonu */}
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        
        <button 
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true); // Opsiyonel: Tamamen kapatmak isterseniz.
          }} 
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 items-start">
          <div className={`mt-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${currentEvent.bg}`}>
            <currentEvent.icon className={`h-5 w-5 ${currentEvent.color}`} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 leading-none">{currentEvent.title}</h4>
            <p className="text-xs text-slate-600 leading-snug">{currentEvent.desc}</p>
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {currentEvent.location}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
