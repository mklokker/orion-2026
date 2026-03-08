import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { base44 } from "@/api/base44Client";
import { CHAT_BG_PRESETS } from "./ChatBackground";
import { Upload, Link, Trash2, Check, Loader2, ImageIcon, Palette } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

/**
 * ChatBackgroundSettings - GLOBAL background settings.
 * Reads/writes to UserPresence fields: chat_bg_type, chat_bg_value, chat_bg_opacity, chat_bg_blur, chat_bg_dim.
 */
export default function ChatBackgroundSettings({ chatBgPrefs, onSave }) {
  const [themeType, setThemeType] = useState(chatBgPrefs?.chat_bg_type || "default");
  const [themeValue, setThemeValue] = useState(chatBgPrefs?.chat_bg_value || "");
  const [themeOpacity, setThemeOpacity] = useState(chatBgPrefs?.chat_bg_opacity ?? 0.15);
  const [themeBlur, setThemeBlur] = useState(chatBgPrefs?.chat_bg_blur ?? 0);
  const [themeDim, setThemeDim] = useState(chatBgPrefs?.chat_bg_dim ?? true);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePresetSelect = (preset) => {
    setThemeType(preset.type);
    setThemeValue(preset.value);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 3MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setThemeType("image");
      setThemeValue(file_url);
      toast.success("Imagem carregada!");
    } catch (err) {
      toast.error("Erro ao enviar imagem");
    }
    setUploading(false);
  };

  const handlePasteUrl = () => {
    if (!imageUrl.trim()) return;
    setThemeType("image");
    setThemeValue(imageUrl.trim());
    setImageUrl("");
  };

  const handleRemove = async () => {
    setSaving(true);
    await onSave({
      chat_bg_type: "default",
      chat_bg_value: "",
      chat_bg_opacity: 0.15,
      chat_bg_blur: 0,
      chat_bg_dim: true,
    });
    setThemeType("default");
    setThemeValue("");
    setThemeOpacity(0.15);
    setThemeBlur(0);
    setThemeDim(true);
    setSaving(false);
    toast.success("Fundo removido");
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      chat_bg_type: themeType,
      chat_bg_value: themeValue,
      chat_bg_opacity: themeOpacity,
      chat_bg_blur: themeBlur,
      chat_bg_dim: themeDim,
    });
    setSaving(false);
    toast.success("Fundo salvo!");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Fundo do Chat (Global)</Label>
      <p className="text-xs text-muted-foreground">Esta configuração é aplicada em todas as conversas.</p>

      {/* Presets grid */}
      <div className="grid grid-cols-4 gap-2">
        {CHAT_BG_PRESETS.map((preset) => {
          const isActive = preset.type === themeType && preset.value === themeValue;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                isActive
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div
                className="w-full h-10 rounded-md border border-border/50"
                style={{
                  background:
                    preset.type === "default"
                      ? "hsl(var(--muted))"
                      : preset.value,
                }}
              />
              <span className="text-[10px] truncate w-full text-center text-muted-foreground">
                {preset.label}
              </span>
              {isActive && (
                <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Image upload section */}
      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <ImageIcon className="w-3 h-3" /> Imagem personalizada
        </Label>

        <div className="flex gap-2">
          <label
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer transition-colors hover:bg-accent text-sm ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{uploading ? "Enviando..." : "Upload"}</span>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Colar URL da imagem..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="text-xs h-8"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handlePasteUrl}
            disabled={!imageUrl.trim()}
            className="h-8 px-2"
          >
            <Link className="w-3 h-3" />
          </Button>
        </div>

        {/* Preview */}
        {themeType === "image" && themeValue && (
          <div className="relative w-full h-20 rounded-lg overflow-hidden border border-border">
            <img
              src={themeValue}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => toast.error("Imagem inválida")}
            />
            <div className="absolute inset-0 bg-background/30" />
          </div>
        )}
      </div>

      {/* Controls */}
      {themeType !== "default" && themeValue && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">Intensidade</Label>
              <span className="text-xs text-muted-foreground">
                {Math.round(themeOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={[themeOpacity]}
              min={0.05}
              max={0.5}
              step={0.05}
              onValueChange={([v]) => setThemeOpacity(v)}
            />
          </div>

          {themeType === "image" && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs">Blur</Label>
                <span className="text-xs text-muted-foreground">
                  {themeBlur}px
                </span>
              </div>
              <Slider
                value={[themeBlur]}
                min={0}
                max={12}
                step={1}
                onValueChange={([v]) => setThemeBlur(v)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-xs">Ajustar para leitura</Label>
            <Switch checked={themeDim} onCheckedChange={setThemeDim} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
          size="sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Salvar Fundo
        </Button>
        {themeType !== "default" && (
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={saving}
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}