"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function LightboxGallery({ images, title = "Galeri" }: { images: string[], title?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        📸 Fotoğraf Galerisi
      </h2>
      
      {/* Grid View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {images.map((url, i) => (
          <div 
            key={i} 
            className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-border bg-muted hover:opacity-80 transition-opacity"
            onClick={() => openLightbox(i)}
          >
            <img src={url} alt={`${title} - Görsel ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 bg-black/90 border-none flex flex-col justify-center items-center overflow-hidden">
          <DialogTitle className="sr-only">Görsel {currentIndex + 1} / {images.length}</DialogTitle>
          <DialogDescription className="sr-only">Galeri görseli büyük görünüm.</DialogDescription>
          
          <button 
            onClick={() => setIsOpen(false)} 
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <button 
              onClick={prevImage} 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-50 p-3 bg-black/50 rounded-full"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          <img 
            src={images[currentIndex]} 
            alt={`${title} - Büyük Görsel ${currentIndex + 1}`} 
            className="max-w-full max-h-full object-contain"
          />

          {images.length > 1 && (
            <button 
              onClick={nextImage} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-50 p-3 bg-black/50 rounded-full"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div className="absolute bottom-4 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
