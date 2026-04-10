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
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col p-4 md:p-8">
      {/* Kapatma Butonu (Ayrı) */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={handleCloseAttempt} 
          className="p-3 bg-background border border-border rounded-full shadow-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Widget'ın Kendisi */}
      <div className="flex-1 overflow-y-auto">
        <LeadFormWidget 
          onSuccess={onClose} 
          className="shadow-2xl border-primary/20"
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
