import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RotateCcw, Save } from "lucide-react";
import {
  calculateContrastRatio,
  isContrastValid,
  getAutoTextColor,
  findClosestLegibleColor,
  getContrastMessage,
} from "./contrastUtils";

export default function BubbleAppearanceModal({ open, onClose, initialData, onSave }) {
  const [myBg, setMyBg] = useState(initialData?.bubble_my_bg || "#4338CA");
  const [myTextMode, setMyTextMode] = useState(initialData?.bubble_my_text_mode || "auto");
  const [myTextColor, setMyTextColor] = useState(initialData?.bubble_my_text_color || "#FFFFFF");

  const [otherBg, setOtherBg] = useState(initialData?.bubble_other_bg || "#E5E7EB");
  const [otherTextMode, setOtherTextMode] = useState(initialData?.bubble_other_text_mode || "auto");
  const [otherTextColor, setOtherTextColor] = useState(initialData?.bubble_other_text_color || "#000000");

  const [metaColorMode, setMetaColorMode] = useState(initialData?.bubble_meta_color_mode || "auto");
  const [metaColor, setMetaColor] = useState(initialData?.bubble_meta_color || "");

  const [warnings, setWarnings] = useState({});
  const [loading, setLoading] = useState(false);

  // Validar contraste quando cores mudam
  useEffect(() => {
    const newWarnings = {};

    if (myTextMode === "custom") {
      if (!isContrastValid(myBg, myTextColor, "AA")) {
        const adjusted = findClosestLegibleColor(myBg, myTextColor, "AA");
        newWarnings.myText = `Contraste baixo. Sugerido: ${adjusted}`;
      }
    }

    if (otherTextMode === "custom") {
      if (!isContrastValid(otherBg, otherTextColor, "AA")) {
        const adjusted = findClosestLegibleColor(otherBg, otherTextColor, "AA");
        newWarnings.otherText = `Contraste baixo. Sugerido: ${adjusted}`;
      }
    }

    setWarnings(newWarnings);
  }, [myBg, myTextMode, myTextColor, otherBg, otherTextMode, otherTextColor]);

  const getMyTextColor = myTextMode === "auto" ? getAutoTextColor(myBg) : myTextColor;
  const getOtherTextColor = otherTextMode === "auto" ? getAutoTextColor(otherBg) : otherTextColor;
  const getMetaColor = metaColorMode === "auto" ? "#999999" : metaColor;

  const handleReset = () => {
    setMyBg("#4338CA");
    setMyTextMode("auto");
    setMyTextColor("#FFFFFF");
    setOtherBg("#E5E7EB");
    setOtherTextMode("auto");
    setOtherTextColor("#000000");
    setMetaColorMode("auto");
    setMetaColor("");
    setWarnings({});
  };

  const handleSave = async () => {
    // Se houver contraste baixo em custom, corrigir automaticamente
    let finalMyText = myTextColor;
    let finalOtherText = otherTextColor;

    if (myTextMode === "custom" && !isContrastValid(myBg, myTextColor, "AA")) {
      finalMyText = findClosestLegibleColor(myBg, myTextColor, "AA");
    }

    if (otherTextMode === "custom" && !isContrastValid(otherBg, otherTextColor, "AA")) {
      finalOtherText = findClosestLegibleColor(otherBg, otherTextColor, "AA");
    }

    setLoading(true);
    try {
      await onSave({
        bubble_my_bg: myBg,
        bubble_my_text_mode: myTextMode,
        bubble_my_text_color: finalMyText,
        bubble_other_bg: otherBg,
        bubble_other_text_mode: otherTextMode,
        bubble_other_text_color: finalOtherText,
        bubble_meta_color_mode: metaColorMode,
        bubble_meta_color: metaColor,
      });
      onClose();
    } catch (error) {
      console.error("Erro ao salvar aparência:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Personalização de Bolhas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ─── Minhas Mensagens ─── */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm md:text-base">Minhas Mensagens</h3>

            {/* Cor de fundo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs md:text-sm text-muted-foreground min-w-[120px]">Fundo:</label>
              <input
                type="color"
                value={myBg}
                onChange={(e) => setMyBg(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-input"
              />
              <span className="text-xs md:text-sm text-foreground font-mono">{myBg}</span>
            </div>

            {/* Modo de fonte */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs md:text-sm text-muted-foreground min-w-[120px]">Fonte:</label>
              <div className="flex gap-2">
                {["auto", "custom"].map((mode) => (
                  <Button
                    key={mode}
                    variant={myTextMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMyTextMode(mode)}
                    className="text-xs md:text-sm"
                  >
                    {mode === "auto" ? "Automática" : "Personalizar"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cor de fonte customizada */}
            {myTextMode === "custom" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-0 sm:pl-[120px]">
                <input
                  type="color"
                  value={myTextColor}
                  onChange={(e) => setMyTextColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-input"
                />
                <span className="text-xs md:text-sm text-foreground font-mono">{myTextColor}</span>
                {warnings.myText && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    {warnings.myText}
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="space-y-2">
                <div
                  style={{
                    backgroundColor: myBg,
                    color: getMyTextColor,
                    padding: "8px 12px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    display: "inline-block",
                    maxWidth: "100%",
                    wordWrap: "break-word",
                  }}
                >
                  Esta é minha mensagem
                </div>
                <div
                  style={{
                    backgroundColor: myBg,
                    color: getMyTextColor,
                    padding: "8px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                    display: "inline-block",
                  }}
                >
                  12:34 ✓✓
                </div>
              </div>
            </div>
          </div>

          {/* ─── Mensagens Recebidas ─── */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="font-semibold text-sm md:text-base">Mensagens Recebidas</h3>

            {/* Cor de fundo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs md:text-sm text-muted-foreground min-w-[120px]">Fundo:</label>
              <input
                type="color"
                value={otherBg}
                onChange={(e) => setOtherBg(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-input"
              />
              <span className="text-xs md:text-sm text-foreground font-mono">{otherBg}</span>
            </div>

            {/* Modo de fonte */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs md:text-sm text-muted-foreground min-w-[120px]">Fonte:</label>
              <div className="flex gap-2">
                {["auto", "custom"].map((mode) => (
                  <Button
                    key={mode}
                    variant={otherTextMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOtherTextMode(mode)}
                    className="text-xs md:text-sm"
                  >
                    {mode === "auto" ? "Automática" : "Personalizar"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cor de fonte customizada */}
            {otherTextMode === "custom" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-0 sm:pl-[120px]">
                <input
                  type="color"
                  value={otherTextColor}
                  onChange={(e) => setOtherTextColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-input"
                />
                <span className="text-xs md:text-sm text-foreground font-mono">{otherTextColor}</span>
                {warnings.otherText && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    {warnings.otherText}
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="space-y-2">
                <div
                  style={{
                    backgroundColor: otherBg,
                    color: getOtherTextColor,
                    padding: "8px 12px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    display: "inline-block",
                    maxWidth: "100%",
                    wordWrap: "break-word",
                  }}
                >
                  Mensagem recebida
                </div>
                <div
                  style={{
                    backgroundColor: otherBg,
                    color: getOtherTextColor,
                    padding: "8px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                    display: "inline-block",
                  }}
                >
                  12:35
                </div>
              </div>
            </div>
          </div>

          {/* ─── Metadata (Opcional) ─── */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="font-semibold text-sm md:text-base">Metadata (Hora, Ticks)</h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs md:text-sm text-muted-foreground min-w-[120px]">Modo:</label>
              <div className="flex gap-2">
                {["auto", "custom"].map((mode) => (
                  <Button
                    key={mode}
                    variant={metaColorMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMetaColorMode(mode)}
                    className="text-xs md:text-sm"
                  >
                    {mode === "auto" ? "Automática" : "Personalizar"}
                  </Button>
                ))}
              </div>
            </div>

            {metaColorMode === "custom" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-0 sm:pl-[120px]">
                <input
                  type="color"
                  value={metaColor}
                  onChange={(e) => setMetaColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-input"
                />
                <span className="text-xs md:text-sm text-foreground font-mono">{metaColor}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || Object.keys(warnings).length > 0}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}