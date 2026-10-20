"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { LEAD_COPY, type LeadFormInitial, type LeadSource } from "@/lib/leadFormData";
import type { LeadFormProgress } from "./LeadFormWidget";

// Navbar mounts this modal on every page: the form itself is only downloaded once it is opened.
const LeadFormWidget = dynamic(() => import("./LeadFormWidget"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted-foreground">Yükleniyor…</p>,
});

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  targetFirmId?: string;
  targetFirmName?: string;
  source?: LeadSource;
  initial?: LeadFormInitial;
}

const INITIAL_PROGRESS: LeadFormProgress = { step: 1, phase: "form", dirty: false };

const LeadFormModal = ({ open, onClose, targetFirmId, targetFirmName, source, initial }: LeadFormModalProps) => {
  const router = useRouter();
  const [progress, setProgress] = useState<LeadFormProgress>(INITIAL_PROGRESS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setProgress(INITIAL_PROGRESS);
      setConfirmOpen(false);
    }
  }, [open]);

  const inVerify = progress.phase === "verify";
  const statusPath = progress.leadId && progress.statusToken ? `/talep/${progress.leadId}?t=${encodeURIComponent(progress.statusToken)}` : null;

  const requestClose = () => {
    if (!inVerify && !progress.dirty) {
      onClose();
      return;
    }
    setConfirmOpen(true);
  };

  const confirmExit = () => {
    setConfirmOpen(false);
    track("lead_form_abandon", { step: progress.step, phase: progress.phase });
    onClose();
    if (inVerify && statusPath) router.push(statusPath);
  };

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-foreground/50 duration-200 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
          {/* Centered with auto margins instead of a translate, so the opacity-only entrance cannot fight a transform. */}
          <DialogPrimitive.Content
            ref={contentRef}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              contentRef.current?.focus();
            }}
            className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-card outline-none duration-200 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 md:m-auto md:h-fit md:max-h-[min(46rem,calc(100dvh_-_2rem))] md:w-full md:max-w-xl md:rounded-2xl md:border md:border-border md:shadow-2xl"
          >
            <DialogPrimitive.Title className="sr-only">Ücretsiz teklif al</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Üç adımda peyzaj talebinizi oluşturun ve doğrulayın.
            </DialogPrimitive.Description>

            <LeadFormWidget
              layout="dialog"
              source={source}
              initial={initial}
              targetFirmId={targetFirmId}
              targetFirmName={targetFirmName}
              onSuccess={onClose}
              onProgress={setProgress}
            />

            <DialogPrimitive.Close
              aria-label="Kapat"
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <AlertDialogPrimitive.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[125] bg-foreground/50" />
          <AlertDialogPrimitive.Content className="fixed inset-x-4 top-1/2 z-[130] mx-auto max-w-md -translate-y-1/2 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl outline-none">
            <div className="space-y-2">
              <AlertDialogPrimitive.Title className="font-heading text-lg font-semibold text-foreground">
                {inVerify ? "Doğrulamayı tamamlamadan çıkmak istiyor musunuz?" : "Çıkmak istediğinize emin misiniz?"}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
                {inVerify ? LEAD_COPY.exitVerify : LEAD_COPY.exitDraft}
              </AlertDialogPrimitive.Description>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogPrimitive.Cancel className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
                {inVerify ? "Doğrulamaya dön" : "Devam et"}
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action onClick={confirmExit} className={buttonVariants({ variant: "gold", className: "min-h-11" })}>
                {inVerify && statusPath ? "Talep sayfasına git" : "Çık"}
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </>
  );
};

export default LeadFormModal;
