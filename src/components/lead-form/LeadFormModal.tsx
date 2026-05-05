import { useState } from "react";
import { X } from "lucide-react";
import LeadFormWidget from "./LeadFormWidget";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  targetFirmId?: string;
  targetFirmName?: string;
}

const LeadFormModal = ({ open, onClose, targetFirmId, targetFirmName }: LeadFormModalProps) => {
  const [showWarning, setShowWarning] = useState(false);

  if (!open) return null;

  const handleCloseAttempt = () => {
    setShowWarning(true);
  };

  const confirmClose = () => {
    setShowWarning(false);
    onClose();
  };

  return (
    <>
      {/* Full-screen container */}
      <div className="fixed inset-0 z-[100] bg-background backdrop-blur-sm flex flex-col">

        {/* Small absolute close button - never overlaps content */}
        <button
          onClick={handleCloseAttempt}
          className="absolute top-3 right-3 z-10 p-1.5 bg-muted border border-border rounded-full shadow-md hover:bg-accent/10 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Widget fills available screen */}
        <div className="flex-1 overflow-hidden">
          <LeadFormWidget
            onSuccess={onClose}
            className="shadow-none border-0 rounded-none md:rounded-2xl md:shadow-2xl md:border md:border-primary/20 md:max-w-xl md:mx-auto md:my-8"
            targetFirmId={targetFirmId}
            targetFirmName={targetFirmName}
          />
        </div>
      </div>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle>Çıkmak istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Formu henüz tamamlamadınız. Şimdi çıkarsanız girdiğiniz tüm bilgiler kaybolacak ve firmalardan teklif alamayacaksınız.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowWarning(false)}>Hayır, Devam Et</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Evet, Çık
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LeadFormModal;
