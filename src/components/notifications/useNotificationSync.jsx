import { useEffect, useCallback, useRef } from 'react';
import { useNotificationStore, playNotificationSound } from './NotificationStore';
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
  const store = useNotificationStore();
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

  const handleNewNotification = useCallback(async (notification) => {
    // Debounce: evita múltiplos toasts do mesmo evento em <2s
    const key = notification.id;
    const now = Date.now();
    if (lastNotificationTimeRef.current[key] && now - lastNotificationTimeRef.current[key] < 2000) {
      return;
    }
    lastNotificationTimeRef.current[key] = now;

    console.log('[useNotificationSync] New notification:', notification.id);

    // Adiciona ao store
    store.addNotification(notification);

    // Atualiza título com novo count
    store.updateDocumentTitle();

    // Toast in-app
    toast({
      title: getNotificationTypeLabel(notification.type),
      description: notification.message,
      action: notification.related_item_id ? (
        {
          label: 'Abrir',
          onClick: () => {
            // Store pode ser consumido via contexto para navegar
            window.dispatchEvent(new CustomEvent('notification-click', { detail: notification }));
          }
        }
      ) : undefined
    });

    // Som
    playNotificationSound();

    // Desktop notification se estiver em background
    const isInBackground = document.hidden;
    if (isInBackground) {
      store.dispatchDesktopNotification(
        getNotificationTypeLabel(notification.type),
        {
          body: notification.message,
          onClickNavigate: () => {
            window.dispatchEvent(new CustomEvent('notification-click', { detail: notification }));
          }
        }
      );
    }
  }, [store, toast, getNotificationTypeLabel]);

  // Inicia subscription ao Notification entity
  useEffect(() => {
    if (!enabled || !userEmail) return;

    // Subscribe a mudanças (create, update, delete)
    unsubscribeRef.current = base44.entities.Notification.subscribe((event) => {
      // Só nos interessa CREATE de notificações para o usuário atual
      if (event.type === 'create' && event.data?.user_email === userEmail) {
        handleNewNotification(event.data);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, userEmail, handleNewNotification]);

  // Sincroniza título quando unread count muda
  useEffect(() => {
    const unsubscribe = useNotificationStore.subscribe(
      (state) => state.notifications,
      () => {
        store.updateDocumentTitle();
      }
    );
    return unsubscribe;
  }, [store]);
}