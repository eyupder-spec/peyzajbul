"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NOTIFICATION_SOUND_URL = "https://actions.google.com/sounds/v1/controls/bell_ding_drop.ogg";

export function useLeadNotifications(firmId: string | null, onNewLead?: () => void) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRef = useRef<NotificationPermission>("default");

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          permissionRef.current = perm;
        });
      }
    }
  }, []);

  // Preload audio and handle autoplay restrictions
  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 1.0;
    audioRef.current = audio;

    const handleFirstUserInteraction = () => {
      // Tarayıcıya kullanıcının sayfayla etkileşime girdiğini kanıtlamak için 
      // sesi 1 saliseliğine çalıp tekrar durduruyoruz (sessizce).
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(e => console.warn("Sessiz oynatma henüz onaylanmadı:", e));
      
      // İlk tıklamada bunu yaptıktan sonra event listener'ı siliyoruz.
      document.removeEventListener("click", handleFirstUserInteraction);
      document.removeEventListener("touchstart", handleFirstUserInteraction);
    };

    document.addEventListener("click", handleFirstUserInteraction);
    document.addEventListener("touchstart", handleFirstUserInteraction);

    return () => {
      document.removeEventListener("click", handleFirstUserInteraction);
      document.removeEventListener("touchstart", handleFirstUserInteraction);
    };
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("Otomatik oynatma tarayıcı tarafından engellenmiş olabilir. Kullanıcının önce sayfada bir yere tıklaması gerekir:", err);
      });
    }
  }, []);

  const showBrowserNotification = useCallback((serviceType: string, city: string) => {
    if ("Notification" in window && permissionRef.current === "granted") {
      new Notification("🔔 Yeni Potansiyel Müşteri!", {
        body: `${serviceType} - ${city} bölgesinden yeni bir talep geldi!`,
        icon: "/favicon.ico",
        tag: "new-lead",
      });
    }
  }, []);

  useEffect(() => {
    if (!firmId) return;

    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
        },
        (payload) => {
          const newLead = payload.new as any;
          // Check if this firm is assigned and admin has approved
          if (newLead.admin_approved && newLead.assigned_firms && newLead.assigned_firms.includes(firmId)) {
            playSound();
            showBrowserNotification(newLead.service_type, newLead.city);
            toast({
              title: "🔔 Yeni Potansiyel Müşteri!",
              description: `${newLead.service_type} - ${newLead.city} bölgesinden yeni talep geldi.`,
            });
            onNewLead?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [firmId, toast, playSound, showBrowserNotification, onNewLead]);
}

