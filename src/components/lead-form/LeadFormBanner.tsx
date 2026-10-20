"use client";

import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadFormModal from "./LeadFormModal";

export default function LeadFormBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Horizontal Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-accent/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Left: text */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-xl bg-accent/10 border border-accent/20 items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-heading font-bold text-primary-foreground text-lg leading-snug">
              Ücretsiz Teklif Alın
            </p>
            <p className="text-primary-foreground/70 text-sm font-body">
              Projenizi anlatın, peyzaj firmaları sizi arasın.
            </p>
          </div>
        </div>

        {/* Right: CTA button */}
        <div className="relative z-10 shrink-0">
          <Button
            variant="gold"
            className="gap-2 font-bold px-6"
            onClick={() => setOpen(true)}
          >
            Teklif Al
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <LeadFormModal open={open} onClose={() => setOpen(false)} source="banner" />
    </>
  );
}
