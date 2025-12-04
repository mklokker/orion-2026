import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ExternalLink, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export default function ImageViewerModal({ isOpen, onClose, imageUrl, altText }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-black/95 border-none overflow-hidden flex flex-col items-center justify-center ring-0 outline-none shadow-2xl">
        <VisuallyHidden.Root>
            <DialogTitle>Visualizador de Imagem</DialogTitle>
        </VisuallyHidden.Root>
        
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                onClick={() => window.open(imageUrl, '_blank')}
                title="Abrir em nova aba"
            >
                <ExternalLink className="w-6 h-6" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                onClick={onClose}
            >
                <X className="w-8 h-8" />
            </Button>
        </div>
        
        <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-10 overflow-hidden">
            <img 
                src={imageUrl} 
                alt={altText || "Imagem em tamanho real"} 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm select-none"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}