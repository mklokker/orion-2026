import React, { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from "lucide-react";

const CROP_SIZE = 256; // output size in px

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export default function ImageCropModal({ open, onClose, imageFile, onCropComplete }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState(280);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Load image from file
  useEffect(() => {
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(imageFile);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [imageFile]);

  // Responsive container size
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      setContainerSize(vw < 400 ? vw - 80 : 280);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleImageLoad = (e) => {
    const img = e.target;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    // Auto-fit: make image cover the crop area
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const initialZoom = containerSize / minDim;
    setZoom(initialZoom);
    setOffset({ x: 0, y: 0 });
  };

  // Get rendered image dimensions at current zoom
  const getRenderedSize = () => {
    if (!naturalSize.w) return { rw: 0, rh: 0 };
    return { rw: naturalSize.w * zoom, rh: naturalSize.h * zoom };
  };

  // Clamp offset so image covers the crop square
  const clampOffset = useCallback((ox, oy, z) => {
    const rw = naturalSize.w * z;
    const rh = naturalSize.h * z;
    const maxX = Math.max(0, (rw - containerSize) / 2);
    const maxY = Math.max(0, (rh - containerSize) / 2);
    return { x: clamp(ox, -maxX, maxX), y: clamp(oy, -maxY, maxY) };
  }, [naturalSize, containerSize]);

  // Mouse/touch drag
  const handlePointerDown = (e) => {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    setDragging(true);
    setDragStart({ x: pt.clientX - offset.x, y: pt.clientY - offset.y });
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const newX = pt.clientX - dragStart.x;
    const newY = pt.clientY - dragStart.y;
    setOffset(clampOffset(newX, newY, zoom));
  }, [dragging, dragStart, zoom, clampOffset]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener("mousemove", handlePointerMove);
      document.addEventListener("mouseup", handlePointerUp);
      document.addEventListener("touchmove", handlePointerMove, { passive: false });
      document.addEventListener("touchend", handlePointerUp);
      return () => {
        document.removeEventListener("mousemove", handlePointerMove);
        document.removeEventListener("mouseup", handlePointerUp);
        document.removeEventListener("touchmove", handlePointerMove);
        document.removeEventListener("touchend", handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  // Zoom with scroll wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const minZoom = containerSize / Math.min(naturalSize.w || 1, naturalSize.h || 1);
    const newZoom = clamp(zoom + delta, Math.max(minZoom, 0.1), 5);
    setZoom(newZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, newZoom));
  };

  const handleZoomChange = (val) => {
    const minZoom = containerSize / Math.min(naturalSize.w || 1, naturalSize.h || 1);
    const newZoom = clamp(val[0], Math.max(minZoom, 0.1), 5);
    setZoom(newZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, newZoom));
  };

  const handleReset = () => {
    const minDim = Math.min(naturalSize.w || 1, naturalSize.h || 1);
    setZoom(containerSize / minDim);
    setOffset({ x: 0, y: 0 });
  };

  // Crop and output
  const handleCrop = () => {
    if (!imgRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d");

    const { rw, rh } = getRenderedSize();

    // The visible crop area in image-pixel coordinates
    const scale = naturalSize.w / rw;
    const cropLeft = ((rw / 2 - containerSize / 2) - offset.x) * scale;
    const cropTop = ((rh / 2 - containerSize / 2) - offset.y) * scale;
    const cropSizePx = containerSize * scale;

    ctx.drawImage(
      imgRef.current,
      cropLeft, cropTop, cropSizePx, cropSizePx,
      0, 0, CROP_SIZE, CROP_SIZE
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
        onCropComplete(file);
      }
    }, "image/jpeg", 0.92);
  };

  const { rw, rh } = getRenderedSize();
  const minZoom = containerSize / Math.min(naturalSize.w || 1, naturalSize.h || 1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Ajustar Foto de Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Arraste para reposicionar. Use o zoom para ajustar o enquadramento.
          </p>

          {/* Crop area */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full border-2 border-primary/50 cursor-grab active:cursor-grabbing bg-muted"
            style={{ width: containerSize, height: containerSize }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onWheel={handleWheel}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                draggable={false}
                className="absolute select-none pointer-events-none"
                style={{
                  width: rw,
                  height: rh,
                  left: `calc(50% - ${rw / 2}px + ${offset.x}px)`,
                  top: `calc(50% - ${rh / 2}px + ${offset.y}px)`,
                }}
              />
            )}
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full" />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full max-w-[280px]">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={Math.max(minZoom, 0.1)}
              max={5}
              step={0.02}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Resetar
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleCrop} className="gap-1">
            <Check className="w-4 h-4" /> Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}