import { useEffect, useCallback, useRef } from 'react';
import { useNotifications } from './NotificationContext';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook para sincronizar notificações com subscriptions em tempo real.
 * Integra:
 * - Real-time updates da entidade Notification
 * - Toast in-app
 * - Web Notifications (desktop)
 * - Document title
 * - Som opcional
 */
export function useNotificationSync(userEmail, enabled = true) {
  const {
    addNotification,
    updateDocumentTitle,
    dispatchDesktopNotification,
    soundEnabled
  } = useNotifications();
  const { toast } = useToast();
  const unsubscribeRef = useRef(null);
  const lastNotificationTimeRef = useRef({});

  const getNotificationTypeLabel = useCallback((type) => {
    const labels = {
      assigned: 'Tarefa Atribuída',
      completed: 'Tarefa Concluída',
      interaction: 'Nova Mensagem',
      transferred: 'Tarefa Transferida'
    };
    return labels[type] || 'Nova Notificação';
  }, []);

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (error) {
      console.warn('[Notifications] Could not play sound:', error);
    }
  }, [soundEnabled]);

  const handleNewNotification = useCallback(async (notification) => {
    // FILTRO DEFENSIVO: validar escopo antes de processar
    if (notification.user_email !== userEmail) {
      console.warn(
        `[useNotificationSync] SECURITY: Ignored notification ${notification.id} - ` +
        `intended for ${notification.user_email}, current user is ${userEmail}`
      );
      return;
    }

    // Debounce: evita múltiplos toasts do mesmo evento em <2s
    const key = notification.id;
    const now = Date.now();
    if (lastNotificationTimeRef.current[key] && now - lastNotificationTimeRef.current[key] < 2000) {
      return;
    }
    lastNotificationTimeRef.current[key] = now;

    console.log('[useNotificationSync] New notification for current user:', notification.id);

    // Adiciona ao contexto (com validação adicional)
    addNotification(notification, userEmail);

    // Atualiza título com novo count
    updateDocumentTitle();

    // Toast in-app
    toast({
      title: getNotificationTypeLabel(notification.type),
      description: notification.message,
      action: notification.related_item_id ? (
        {
          label: 'Abrir',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('notification-click', { detail: notification }));
          }
        }
      ) : undefined
    });

    // Som
    playSound();

    // Desktop notification se estiver em background
    const isInBackground = document.hidden;
    if (isInBackground) {
      dispatchDesktopNotification(
        getNotificationTypeLabel(notification.type),
        {
          body: notification.message,
          onClickNavigate: () => {
            window.dispatchEvent(new CustomEvent('notification-click', { detail: notification }));
          }
        }
      );
    }
  }, [addNotification, updateDocumentTitle, dispatchDesktopNotification, toast, getNotificationTypeLabel, playSound, userEmail]);

  // Inicia subscription ao Notification entity
  useEffect(() => {
    if (!enabled || !userEmail) return;

    console.log(`[useNotificationSync] Starting subscription for ${userEmail}`);

    // Subscribe a mudanças (create, update, delete)
    unsubscribeRef.current = base44.entities.Notification.subscribe((event) => {
      // Só nos interessa CREATE de notificações para o usuário atual
      if (event.type === 'create') {
        if (event.data?.user_email === userEmail) {
          handleNewNotification(event.data);
        } else if (event.data?.user_email) {
          console.log(
            `[useNotificationSync] Ignored event - notification for ${event.data.user_email}, ` +
            `current user is ${userEmail}`
          );
        }
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, userEmail, handleNewNotification]);


}