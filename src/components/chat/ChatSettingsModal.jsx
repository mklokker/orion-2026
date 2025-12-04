import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Moon, MessageSquare, Users, AtSign, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@/entities/User";

export default function ChatSettingsModal({ open, onClose, currentUser, onUpdate }) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState(currentUser?.chat_preferences || {
    notify_direct: true,
    notify_group: true,
    notify_mentions: true,
    dnd_until: null,
    notification_sound: "default"
  });

  const [dndDuration, setDndDuration] = useState("none");

  const playSoundPreview = (soundType) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      
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
        default: // default
          oscillator.frequency.value = 440;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
      }
    } catch (e) {
      console.error("Audio preview failed", e);
    }
  };

  const handleSoundChange = (value) => {
    setPreferences(prev => ({ ...prev, notification_sound: value }));
    playSoundPreview(value);
  };

  const handleToggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDndChange = (value) => {
    setDndDuration(value);
    let dndUntil = null;
    
    if (value !== "none") {
      const now = new Date();
      if (value === "30m") now.setMinutes(now.getMinutes() + 30);
      if (value === "1h") now.setHours(now.getHours() + 1);
      if (value === "8h") now.setHours(now.getHours() + 8);
      if (value === "tomorrow") now.setDate(now.getDate() + 1);
      dndUntil = now.toISOString();
    }
    
    setPreferences(prev => ({ ...prev, dnd_until: dndUntil }));
  };

  const handleSave = async () => {
    try {
      await User.update(currentUser.id, {
        chat_preferences: preferences
      });
      
      toast({ title: "Configurações salvas", description: "Suas preferências de notificação foram atualizadas." });
      onUpdate(); // Refresh user data in parent
      onClose();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao salvar configurações.", variant: "destructive" });
    }
  };

  const isDndActive = preferences.dnd_until && new Date(preferences.dnd_until) > new Date();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configurações de Notificação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Do Not Disturb */}
          <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className={`w-5 h-5 ${isDndActive ? "text-indigo-600" : "text-slate-500"}`} />
                <Label className="font-medium text-base">Não Perturbe</Label>
              </div>
              {isDndActive && (
                <span className="text-xs text-indigo-600 font-medium px-2 py-1 bg-indigo-50 rounded-full">
                  Ativo até {new Date(preferences.dnd_until).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
            
            <Select value={dndDuration} onValueChange={handleDndChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a duração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Desativado (Receber notificações)</SelectItem>
                <SelectItem value="30m">Por 30 minutos</SelectItem>
                <SelectItem value="1h">Por 1 hora</SelectItem>
                <SelectItem value="8h">Por 8 horas</SelectItem>
                <SelectItem value="tomorrow">Até amanhã</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Silencia sons e popups de notificação durante o período.</p>
          </div>

          {/* Sound Settings */}
          <div className="bg-white p-4 rounded-lg border space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-slate-500" />
              <Label className="font-medium text-base">Som de Notificação</Label>
            </div>
            
            <Select 
              value={preferences.notification_sound || "default"} 
              onValueChange={handleSoundChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o som" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão (Bip)</SelectItem>
                <SelectItem value="chime">Carrilhão (Suave)</SelectItem>
                <SelectItem value="bell">Sino (Claro)</SelectItem>
                <SelectItem value="pop">Pop (Curto)</SelectItem>
                <SelectItem value="ding">Ding (Agudo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <Label className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Receber notificações de:</Label>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-base block cursor-pointer" htmlFor="notify_direct">Chats Diretos</Label>
                  <span className="text-xs text-slate-500">Mensagens 1:1</span>
                </div>
              </div>
              <Switch 
                id="notify_direct"
                checked={preferences.notify_direct}
                onCheckedChange={() => handleToggle("notify_direct")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-full text-green-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-base block cursor-pointer" htmlFor="notify_group">Grupos</Label>
                  <span className="text-xs text-slate-500">Mensagens de grupos e departamentos</span>
                </div>
              </div>
              <Switch 
                id="notify_group"
                checked={preferences.notify_group}
                onCheckedChange={() => handleToggle("notify_group")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-full text-orange-600">
                  <AtSign className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-base block cursor-pointer" htmlFor="notify_mentions">Menções (@)</Label>
                  <span className="text-xs text-slate-500">Sempre notificar quando me marcarem</span>
                </div>
              </div>
              <Switch 
                id="notify_mentions"
                checked={preferences.notify_mentions}
                onCheckedChange={() => handleToggle("notify_mentions")}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}