import { X } from "lucide-react";
import LeadFormWidget from "./LeadFormWidget";

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  targetFirmId?: string;
  targetFirmName?: string;
}

const LeadFormModal = ({ open, onClose, targetFirmId, targetFirmName }: LeadFormModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col p-4 md:p-8">
      {/* Kapatma Butonu (Ayrı) */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={onClose} 
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
  );
};

export default LeadFormModal;
