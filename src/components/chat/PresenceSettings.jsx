import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Circle, Moon, MinusCircle, Zap, Bell, Volume2, MessageSquare, AtSign, Users, Play, Clock, BellOff, Palette } from "lucide-react";
import { UserPresence } from "@/entities/UserPresence";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound, SOUND_OPTIONS } from "./NotificationSounds";
import { format, addHours, addMinutes, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChatBackgroundSettings from "./ChatBackgroundSettings";

const statusOptions = [
  { value: "auto", label: "Automático", description: "Detectar automaticamente", icon: Zap, color: "text-blue-500" },
  { value: "online", label: "Online", description: "Aparecer como disponível", icon: Circle, color: "text-green-500" },
  { value: "away", label: "Ausente", description: "Aparecer como ausente", icon: Moon, color: "text-yellow-500" },
  { value: "dnd", label: "Não Incomodar", description: "Silenciar notificações", icon: MinusCircle, color: "text-red-500" }
];

export default function PresenceSettings({ open, onClose, currentUser, presence, onUpdate, onBgUpdate }) {
  const { toast } = useToast();
  const [manualStatus, setManualStatus] = useState(presence?.manual_status || "auto");
  const [statusMessage, setStatusMessage] = useState(presence?.status_message || "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("status");
  
  // Notification settings
  const [notifyNewMessages, setNotifyNewMessages] = useState(presence?.notify_new_messages !== false);
  const [notifyMentions, setNotifyMentions] = useState(presence?.notify_mentions !== false);
  const [notifyGroupMessages, setNotifyGroupMessages] = useState(presence?.notify_group_messages !== false);
  const [notificationSound, setNotificationSound] = useState(presence?.notification_sound || "default");
  const [pushEnabled, setPushEnabled] = useState(presence?.push_enabled || false);
  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [muteUntil, setMuteUntil] = useState(presence?.mute_until || null);
  const [cooldownSeconds, setCooldownSeconds] = useState(presence?.notification_cooldown_seconds || 30);
  
  const isMuted = muteUntil && !isPast(new Date(muteUntil));

  useEffect(() => {
    if (presence) {
      setManualStatus(presence.manual_status || "auto");
      setStatusMessage(presence.status_message || "");
      setNotifyNewMessages(presence.notify_new_messages !== false);
      setNotifyMentions(presence.notify_mentions !== false);
      setNotifyGroupMessages(presence.notify_group_messages !== false);
      setNotificationSound(presence.notification_sound || "default");
      setPushEnabled(presence.push_enabled || false);
      setMuteUntil(presence.mute_until || null);
      setCooldownSeconds(presence.notification_cooldown_seconds || 30);
    }
  }, [presence]);

  const handleMuteFor = async (minutes) => {
    const until = addMinutes(new Date(), minutes);
    setMuteUntil(until.toISOString());
    
    if (presence?.id) {
      try {
        await UserPresence.update(presence.id, { mute_until: until.toISOString() });
        toast({ title: `Notificações silenciadas por ${minutes} minutos` });
        onUpdate?.();
      } catch (e) {
        console.error("Erro ao silenciar:", e);
      }
    }
  };

  const handleUnmute = async () => {
    setMuteUntil(null);
    
    if (presence?.id) {
      try {
        await UserPresence.update(presence.id, { mute_until: null });
        toast({ title: "Notificações reativadas" });
        onUpdate?.();
      } catch (e) {
        console.error("Erro ao reativar:", e);
      }
    }
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast({ title: "Notificações não suportadas", description: "Seu navegador não suporta notificações push.", variant: "destructive" });
      return;
    }
    
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    
    if (permission === 'granted') {
      setPushEnabled(true);
      toast({ title: "Notificações ativadas!" });
    } else {
      toast({ title: "Permissão negada", description: "Você pode alterar nas configurações do navegador.", variant: "destructive" });
    }
  };

  const handleTestSound = () => {
    playNotificationSound(notificationSound);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    
    try {
      const newStatus = manualStatus === "auto" ? "online" : manualStatus;
      const data = {
        manual_status: manualStatus,
        status: newStatus,
        status_message: statusMessage,
        last_seen: new Date().toISOString(),
        notify_new_messages: notifyNewMessages,
        notify_mentions: notifyMentions,
        notify_group_messages: notifyGroupMessages,
        notification_sound: notificationSound,
        push_enabled: pushEnabled && pushPermission === 'granted',
        mute_until: muteUntil,
        notification_cooldown_seconds: cooldownSeconds
      };
      
      if (presence?.id) {
        await UserPresence.update(presence.id, data);
      } else {
        await UserPresence.create({
          user_email: currentUser.email,
          ...data
        });
      }
      
      toast({ title: "Configurações salvas!" });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do Chat</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status" className="gap-1 text-xs sm:text-sm">
              <Circle className="w-3.5 h-3.5" />
              Status
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 text-xs sm:text-sm">
              <Bell className="w-3.5 h-3.5" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1 text-xs sm:text-sm">
              <Palette className="w-3.5 h-3.5" />
              Aparência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Status de Presença</Label>
              <RadioGroup value={manualStatus} onValueChange={setManualStatus}>
                {statusOptions.map(opt => (
                  <div
                    key={opt.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      manualStatus === opt.value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500" : "border-gray-200 dark:border-[#2e2e2e] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                    }`}
                    onClick={() => setManualStatus(opt.value)}
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <opt.icon className={`w-5 h-5 ${opt.color}`} />
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-[#6b6b6b]">{opt.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Status (opcional)</Label>
              <Input
                placeholder="Ex: Em reunião até 15h"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                maxLength={100}
              />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 py-4">
            {/* Push Notifications */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notificações Push
              </Label>
              
              {pushPermission !== 'granted' ? (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={requestPushPermission}
                >
                  <Bell className="w-4 h-4" />
                  Ativar Notificações Push
                </Button>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-[#22946E]/20 border-green-200 dark:border-[#22946E]/30">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-green-600 dark:text-[#22946E]" />
                    <span className="text-sm text-green-700 dark:text-[#22946E]">Notificações push ativadas</span>
                  </div>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={setPushEnabled}
                  />
                </div>
              )}
            </div>

            {/* Notification Types */}
            <div className="space-y-3">
              <Label>Tipos de Notificação</Label>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border dark:border-[#2e2e2e] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm dark:text-white">Novas Mensagens</p>
                      <p className="text-xs text-gray-500 dark:text-[#6b6b6b]">Mensagens diretas</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyNewMessages}
                    onCheckedChange={setNotifyNewMessages}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border dark:border-[#2e2e2e] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    <AtSign className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-sm dark:text-white">Menções</p>
                      <p className="text-xs text-gray-500 dark:text-[#6b6b6b]">Quando alguém mencionar você</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyMentions}
                    onCheckedChange={setNotifyMentions}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border dark:border-[#2e2e2e] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm dark:text-white">Mensagens de Grupos</p>
                      <p className="text-xs text-gray-500 dark:text-[#6b6b6b]">Mensagens em conversas de grupo</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyGroupMessages}
                    onCheckedChange={setNotifyGroupMessages}
                  />
                </div>
              </div>
            </div>

            {/* Notification Sound */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Som de Notificação
              </Label>
              
              <div className="flex gap-2">
                <Select value={notificationSound} onValueChange={setNotificationSound}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleTestSound}
                  disabled={notificationSound === "none"}
                  title="Testar som"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mute Temporarily */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <BellOff className="w-4 h-4" />
                Silenciar Temporariamente
              </Label>
              
              {isMuted ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-[#A87A2A]/20 border border-amber-200 dark:border-[#A87A2A]/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-[#A87A2A]">Notificações silenciadas</p>
                      <p className="text-xs text-amber-600 dark:text-[#A87A2A]/80">
                        Até {format(new Date(muteUntil), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleUnmute}>
                      Reativar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleMuteFor(30)}>
                    30 min
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleMuteFor(60)}>
                    1 hora
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleMuteFor(120)}>
                    2 horas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleMuteFor(480)}>
                    8 horas
                  </Button>
                </div>
              )}
            </div>

            {/* Cooldown */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Intervalo entre Notificações
              </Label>
              <Select value={String(cooldownSeconds)} onValueChange={(v) => setCooldownSeconds(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sem intervalo</SelectItem>
                  <SelectItem value="10">10 segundos</SelectItem>
                  <SelectItem value="30">30 segundos</SelectItem>
                  <SelectItem value="60">1 minuto</SelectItem>
                  <SelectItem value="120">2 minutos</SelectItem>
                  <SelectItem value="300">5 minutos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-[#6b6b6b]">
                Tempo mínimo entre notificações da mesma conversa
              </p>
            </div>

            {manualStatus === "dnd" && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-[#A87A2A]/20 border border-amber-200 dark:border-[#A87A2A]/30">
                <p className="text-sm text-amber-700 dark:text-[#A87A2A]">
                  <strong>Modo "Não Incomodar" ativo:</strong> Você não receberá notificações enquanto este modo estiver ativado.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 py-4">
            <ChatBackgroundSettings
              chatBgPrefs={presence}
              onSave={async (bgData) => {
                if (presence?.id) {
                  await UserPresence.update(presence.id, bgData);
                  onBgUpdate?.(bgData);
                  onUpdate?.();
                }
              }}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t dark:border-[#2e2e2e]">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}