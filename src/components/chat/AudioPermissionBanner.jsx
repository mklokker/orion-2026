import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, X, Bell } from "lucide-react";
import { unlockAudio, isAudioUnlocked, playNotificationSound } from "./NotificationSounds";

export default function AudioPermissionBanner({ onDismiss }) {
  const [showBanner, setShowBanner] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Verifica se já foi desbloqueado antes
    const alreadyUnlocked = isAudioUnlocked();
    const dismissed = localStorage.getItem('audioPermissionDismissed') === 'true';
    
    if (!alreadyUnlocked && !dismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    const success = await unlockAudio();
    
    if (success) {
      // Toca um som de teste para confirmar
      setTimeout(() => {
        playNotificationSound("default");
      }, 100);
      
      setPermissionGranted(true);
      
      // Também solicita permissão de notificação push
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      setTimeout(() => {
        setShowBanner(false);
        onDismiss?.();
      }, 1500);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('audioPermissionDismissed', 'true');
    setShowBanner(false);
    onDismiss?.();
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-in slide-in-from-bottom-4">
      {permissionGranted ? (
        <div className="flex items-center gap-3 text-green-600">
          <Volume2 className="w-6 h-6" />
          <span className="font-medium">Sons de notificação ativados!</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Ativar Notificações</h4>
              <p className="text-sm text-gray-600 mt-1">
                Clique para ativar sons de notificação e alertas do chat.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleEnable} className="flex-1 gap-2">
              <Volume2 className="w-4 h-4" />
              Ativar Sons
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Agora não
            </Button>
          </div>
        </>
      )}
    </div>
  );
}