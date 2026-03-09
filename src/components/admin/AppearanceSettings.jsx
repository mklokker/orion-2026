import React, { useState, useEffect } from "react";
import { AppSettings } from "@/entities/AppSettings";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Upload, Save, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AppearanceSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await AppSettings.list();
      if (data.length > 0) {
        setSettings(data[0]);
        setInitialSettings(data[0]);
      } else {
        // Valores padrão se não houver configurações salvas
        const defaultSettings = {
          logo_url: "",
          logo_subtitle: "Registro de Imóveis",
          primary_color: "#4338CA",
          primary_accent_color: "#3730A3",
          success_color: "#10B981",
          danger_color: "#EF4444",
          notification_sound: "default" // Adicionado o som de notificação padrão
        };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de aparência.",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const playNotificationSound = (soundType) => {
    if (soundType === 'none') return;

    // Check if AudioContext is supported
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API is not supported in this browser.");
      toast({
        title: "Erro",
        description: "Seu navegador não suporta a reprodução de sons de notificação.",
        variant: "destructive"
      });
      return;
    }

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // CORRIGIDO: start() ANTES de configurar stop()
    oscillator.start(audioContext.currentTime);
    
    // Configure sound based on type
    switch(soundType) {
      case 'chime':
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case 'bell':
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        oscillator.stop(audioContext.currentTime + 0.8);
        break;
      case 'pop':
        oscillator.frequency.value = 600;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'ding':
        oscillator.frequency.value = 1200;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'default':
      default:
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let updatedSettings = { ...settings };

    if (logoFile) {
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({ file: logoFile });
        updatedSettings.logo_url = file_url;
        setLogoFile(null); // Reset file after upload
      } catch (error) {
        toast({
          title: "Erro de Upload",
          description: "Não foi possível enviar o novo logo. Tente novamente.",
          variant: "destructive"
        });
        setIsSaving(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    try {
      if (settings.id) {
        await AppSettings.update(settings.id, updatedSettings);
      } else {
        await AppSettings.create(updatedSettings);
      }
      toast({
        title: "Sucesso!",
        description: "Aparência do sistema atualizada. Recarregue a página para ver todas as mudanças.",
      });
      loadSettings(); // Recarregar para obter o ID se foi uma criação
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  if (!settings) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Carregando configurações de aparência...</CardTitle>
        </CardHeader>
        <CardContent><Loader2 className="w-8 h-8 animate-spin" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 col-span-1 lg:col-span-2 bg-card">
      <CardHeader className="border-b border-border bg-muted/50">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Palette className="w-5 h-5" />
          Personalização da Aparência
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* Seção do Logo */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">Logo e Título</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <Label htmlFor="logo-subtitle">Subtítulo do Logo</Label>
              <Input
                id="logo-subtitle"
                value={settings.logo_subtitle}
                onChange={(e) => setSettings({ ...settings, logo_subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border border-border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Prévia do Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <Button asChild variant="outline">
                  <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Trocar Logo
                    <input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml, image/webp" className="hidden" onChange={handleFileChange} />
                  </label>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Para melhor visualização, use uma imagem horizontal (aprox. 250x100 pixels) com fundo transparente.
              </p>
            </div>
          </div>
        </div>

        {/* Seção de Cores */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">Paleta de Cores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Cor Primária</Label>
              <Input id="primary-color" type="color" value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary-accent-color">Acento Primário</Label>
              <Input id="primary-accent-color" type="color" value={settings.primary_accent_color} onChange={(e) => setSettings({ ...settings, primary_accent_color: e.target.value })} className="h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="success-color">Cor de Sucesso</Label>
              <Input id="success-color" type="color" value={settings.success_color} onChange={(e) => setSettings({ ...settings, success_color: e.target.value })} className="h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="danger-color">Cor de Alerta</Label>
              <Input id="danger-color" type="color" value={settings.danger_color} onChange={(e) => setSettings({ ...settings, danger_color: e.target.value })} className="h-10 p-1" />
            </div>
          </div>
        </div>

        {/* Seção de Animação da Sidebar */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">Animação da Sidebar</h3>
          <div className="space-y-2">
            <Label htmlFor="sidebar-animation">Velocidade da animação (ms)</Label>
            <div className="flex items-center gap-4">
              <input
                id="sidebar-animation"
                type="range"
                min={150}
                max={2000}
                step={50}
                value={settings.sidebar_animation_ms ?? 1050}
                onChange={(e) => setSettings({ ...settings, sidebar_animation_ms: Number(e.target.value) })}
                className="w-48 accent-primary"
              />
              <span className="text-sm text-muted-foreground w-16">
                {settings.sidebar_animation_ms ?? 1050}ms
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Controla a velocidade de abertura/fechamento da sidebar lateral. Valores maiores = mais lento. Padrão: 1050ms.
            </p>
          </div>
        </div>

        {/* Nova Seção de Notificações */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">Sons de Notificação</h3>
          <div className="space-y-2">
            <Label htmlFor="notification-sound">Som de Notificação Padrão</Label>
            <div className="flex items-center gap-4">
              <Select 
                value={settings.notification_sound || 'default'} 
                onValueChange={(value) => setSettings({ ...settings, notification_sound: value })}
              >
                <SelectTrigger id="notification-sound" className="w-64">
                  <SelectValue placeholder="Selecione um som..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                  <SelectItem value="bell">Sino</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="ding">Ding</SelectItem>
                  <SelectItem value="none">Sem som</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => playNotificationSound(settings.notification_sound || 'default')}
                disabled={settings.notification_sound === 'none'}
                className="gap-2"
              >
                <Upload className="w-4 h-4" /> {/* Reusing Upload icon, consider a different one if more semantic */}
                Testar Som
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este som será usado para notificações de novas mensagens no chat e outras notificações do sistema.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isUploading ? "Enviando logo..." : isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}