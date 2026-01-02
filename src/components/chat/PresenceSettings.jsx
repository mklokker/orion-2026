import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Circle, Moon, MinusCircle, Zap } from "lucide-react";
import { UserPresence } from "@/entities/UserPresence";
import { useToast } from "@/components/ui/use-toast";

const statusOptions = [
  { value: "auto", label: "Automático", description: "Detectar automaticamente", icon: Zap, color: "text-blue-500" },
  { value: "online", label: "Online", description: "Aparecer como disponível", icon: Circle, color: "text-green-500" },
  { value: "away", label: "Ausente", description: "Aparecer como ausente", icon: Moon, color: "text-yellow-500" },
  { value: "dnd", label: "Não Incomodar", description: "Silenciar notificações", icon: MinusCircle, color: "text-red-500" }
];

export default function PresenceSettings({ open, onClose, currentUser, presence, onUpdate }) {
  const { toast } = useToast();
  const [manualStatus, setManualStatus] = useState(presence?.manual_status || "auto");
  const [statusMessage, setStatusMessage] = useState(presence?.status_message || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (presence) {
      setManualStatus(presence.manual_status || "auto");
      setStatusMessage(presence.status_message || "");
    }
  }, [presence]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    
    try {
      const newStatus = manualStatus === "auto" ? "online" : manualStatus;
      
      if (presence?.id) {
        await UserPresence.update(presence.id, {
          manual_status: manualStatus,
          status: newStatus,
          status_message: statusMessage,
          last_seen: new Date().toISOString()
        });
      } else {
        await UserPresence.create({
          user_email: currentUser.email,
          manual_status: manualStatus,
          status: newStatus,
          status_message: statusMessage,
          last_seen: new Date().toISOString()
        });
      }
      
      toast({ title: "Status atualizado!" });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar status:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Presença</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Status de Presença</Label>
            <RadioGroup value={manualStatus} onValueChange={setManualStatus}>
              {statusOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    manualStatus === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setManualStatus(opt.value)}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <opt.icon className={`w-5 h-5 ${opt.color}`} />
                  <div className="flex-1">
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
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
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}