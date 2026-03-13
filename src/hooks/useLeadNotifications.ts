"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useLeadNotifications(userId: string | null, onNewLead?: () => void) {
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

  // Preload audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const showBrowserNotification = useCallback((serviceType: string, city: string) => {
    if ("Notification" in window && permissionRef.current === "granted") {
      new Notification("🔔 Yeni Lead!", {
        body: `${serviceType} - ${city} bölgesinden yeni bir talep geldi!`,
        icon: "/favicon.ico",
        tag: "new-lead",
      });
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
        },
        (payload) => {
          const newLead = payload.new as any;
          // Check if this firm is assigned
          if (newLead.assigned_firms && newLead.assigned_firms.includes(userId)) {
            playSound();
            showBrowserNotification(newLead.service_type, newLead.city);
            toast({
              title: "🔔 Yeni Lead!",
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
  }, [userId, toast, playSound, showBrowserNotification, onNewLead]);
}

