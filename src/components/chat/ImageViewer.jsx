import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

export default function ImageViewer({ open, onClose, imageUrl }) {
  const [zoom, setZoom] = React.useState(1);

  const handleDownload = () => {
    window.open(imageUrl, "_blank");
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(z => Math.min(z + 0.5, 3))}
            className="text-white hover:bg-white/20"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}
            className="text-white hover:bg-white/20"
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center w-full h-[90vh] overflow-auto p-4">
          <img
            src={imageUrl}
            alt="Imagem"
            style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}