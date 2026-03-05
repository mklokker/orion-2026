import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification } from '@/entities/Notification';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Derived
  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = React.useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'task':
        return notifications.filter(n => n.type === 'assigned' || n.type === 'completed');
      case 'chat':
        return notifications.filter(n => n.type === 'interaction');
      case 'system':
        return notifications.filter(n => n.type === 'transferred');
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const loadNotifications = useCallback(async (userEmail) => {
    setIsLoading(true);
    try {
      // Backend deve filtrar por user_email, mas frontend valida defensivamente
      const notifs = await Notification.filter(
        { user_email: userEmail },
        '-created_date'
      );
      
      // Filtro defensivo: apenas notificações para o usuário logado
      const validNotifs = notifs.filter(n => {
        if (n.user_email !== userEmail) {
          console.warn(`[Notifications] SECURITY: Ignored notification ${n.id} - not intended for ${userEmail}`);
          return false;
        }
        return true;
      });
      
      setNotifications(validNotifs);
      console.log(`[Notifications] Loaded ${validNotifs.length}/${notifs.length} valid notifications`);
    } catch (error) {
      console.error('[Notifications] Error loading:', error);
    }
    setIsLoading(false);
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      console.log(`[Notifications] Marked ${notificationId} as read`);
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      for (const id of unreadIds) {
        await Notification.update(id, { read: true });
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      console.log(`[Notifications] Marked ${unreadIds.length} as read`);
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log(`[Notifications] Deleted ${notificationId}`);
    } catch (error) {
      console.error('[Notifications] Error deleting:', error);
    }
  }, []);

  const addNotification = useCallback((notification, currentUserEmail) => {
    // Filtro defensivo: validar que a notificação é para o usuário atual
    if (currentUserEmail && notification.user_email !== currentUserEmail) {
      console.warn(
        `[Notifications] SECURITY: Ignored incoming notification ${notification.id} - ` +
        `intended for ${notification.user_email}, current user is ${currentUserEmail}`
      );
      return;
    }
    setNotifications(prev => [notification, ...prev]);
    console.log('[Notifications] Added:', notification.id);
  }, []);

  const updateDocumentTitle = useCallback(() => {
    const count = unreadCount;
    const prefix = count > 0 ? `(${count}) ` : '';
    document.title = `${prefix}Orion`;
  }, [unreadCount]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Web Notifications not supported');
      return 'denied';
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      console.log(`[Notifications] Permission: ${perm}`);
      if (perm === 'granted') {
        new window.Notification('Alertas Ativados', {
          body: 'Você receberá notificações do Orion.'
        });
      }
      return perm;
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return 'denied';
    }
  }, []);

  const dispatchDesktopNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window) || notificationPermission !== 'granted') {
      return;
    }
    try {
      const notif = new window.Notification(title, {
        icon: '/orion-icon.png',
        badge: '/orion-badge.png',
        tag: 'orion-notification',
        ...options
      });
      notif.onclick = () => {
        window.focus();
        if (options.onClickNavigate) options.onClickNavigate();
      };
      console.log('[Notifications] Desktop notification sent:', title);
    } catch (error) {
      console.error('[Notifications] Error dispatching:', error);
    }
  }, [notificationPermission]);

  const restoreSoundPreference = useCallback(() => {
    try {
      const saved = localStorage.getItem('orion_sound_enabled');
      if (saved === 'true') setSoundEnabled(true);
    } catch {}
  }, []);

  React.useEffect(() => {
    updateDocumentTitle();
  }, [unreadCount, updateDocumentTitle]);

  const value = {
    notifications,
    isLoading,
    filter,
    setFilter,
    unreadCount,
    filteredNotifications,
    notificationPermission,
    soundEnabled,
    setSoundEnabled,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    updateDocumentTitle,
    requestNotificationPermission,
    dispatchDesktopNotification,
    restoreSoundPreference
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}