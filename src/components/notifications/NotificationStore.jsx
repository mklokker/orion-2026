import { create } from 'zustand';
import { Notification } from '@/entities/Notification';

/**
 * Single source of truth para notificações em toda a app.
 * Sincroniza: badges, título da aba, Central, toasts, Web Notifications.
 */
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  isLoading: false,
  filter: 'all', // 'all' | 'unread' | 'task' | 'chat' | 'system'
  notificationPermission: 'denied',
  soundEnabled: false,

  // ─ Derived state
  unreadCount: () => {
    const { notifications } = get();
    return notifications.filter(n => !n.read).length;
  },

  filteredNotifications: () => {
    const { notifications, filter } = get();
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
  },

  // ─ Load notifications from backend
  loadNotifications: async (userEmail) => {
    set({ isLoading: true });
    try {
      const notifs = await Notification.filter(
        { user_email: userEmail },
        '-created_date'
      );
      set({ notifications: notifs, isLoading: false });
      console.log(`[NotificationStore] Loaded ${notifs.length} notifications`);
      return notifs;
    } catch (error) {
      console.error('[NotificationStore] Error loading notifications:', error);
      set({ isLoading: false });
      return [];
    }
  },

  // ─ Mark single as read
  markAsRead: async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      }));
      console.log(`[NotificationStore] Marked ${notificationId} as read`);
    } catch (error) {
      console.error('[NotificationStore] Error marking as read:', error);
    }
  },

  // ─ Mark all unread as read
  markAllAsRead: async () => {
    try {
      const { notifications } = get();
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      for (const id of unreadIds) {
        await Notification.update(id, { read: true });
      }
      
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      }));
      console.log(`[NotificationStore] Marked ${unreadIds.length} as read`);
    } catch (error) {
      console.error('[NotificationStore] Error marking all as read:', error);
    }
  },

  // ─ Delete notification
  deleteNotification: async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== notificationId)
      }));
      console.log(`[NotificationStore] Deleted ${notificationId}`);
    } catch (error) {
      console.error('[NotificationStore] Error deleting notification:', error);
    }
  },

  // ─ Add new notification (called from subscriptions/webhooks)
  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications]
    }));
    console.log('[NotificationStore] Added new notification:', notification.id);
  },

  // ─ Update filter
  setFilter: (newFilter) => {
    set({ filter: newFilter });
    console.log(`[NotificationStore] Filter changed to: ${newFilter}`);
  },

  // ─ Request Web Notification permission
  requestNotificationPermission: async () => {
    if (!('Notification' in window)) {
      console.warn('[NotificationStore] Web Notifications not supported');
      return 'denied';
    }

    try {
      const perm = await Notification.requestPermission();
      set({ notificationPermission: perm });
      console.log(`[NotificationStore] Permission: ${perm}`);
      
      if (perm === 'granted') {
        // Test notification
        new window.Notification('Alertas Ativados', {
          body: 'Você receberá notificações do Orion.',
          icon: '/orion-icon.png'
        });
      }
      return perm;
    } catch (error) {
      console.error('[NotificationStore] Error requesting permission:', error);
      return 'denied';
    }
  },

  // ─ Dispatch Web Notification (desktop/system)
  dispatchDesktopNotification: (title, options = {}) => {
    const { notificationPermission } = get();
    
    if (!('Notification' in window)) {
      console.warn('[NotificationStore] Web Notifications not supported');
      return;
    }

    if (notificationPermission !== 'granted') {
      console.log('[NotificationStore] Permission not granted for desktop notification');
      return;
    }

    // Evita duplicatas com tag (mesma tag replace anterior)
    const defaultOptions = {
      icon: '/orion-icon.png',
      badge: '/orion-badge.png',
      tag: 'orion-notification', // Só uma por vez
      requireInteraction: false,
      ...options
    };

    try {
      const notif = new window.Notification(title, defaultOptions);
      
      // Ao clicar, focar na aba
      notif.onclick = () => {
        window.focus();
        if (options.onClickNavigate) options.onClickNavigate();
      };

      console.log('[NotificationStore] Desktop notification sent:', title);
    } catch (error) {
      console.error('[NotificationStore] Error dispatching desktop notification:', error);
    }
  },

  // ─ Update document title with unread count
  updateDocumentTitle: () => {
    const { unreadCount } = get();
    const count = unreadCount();
    const prefix = count > 0 ? `(${count}) ` : '';
    document.title = `${prefix}Orion`;
  },

  // ─ Toggle sound
  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    if (enabled) {
      try {
        localStorage.setItem('orion_sound_enabled', 'true');
      } catch {}
    } else {
      try {
        localStorage.removeItem('orion_sound_enabled');
      } catch {}
    }
  },

  // ─ Restore sound preference
  restoreSoundPreference: () => {
    try {
      const saved = localStorage.getItem('orion_sound_enabled');
      if (saved === 'true') {
        set({ soundEnabled: true });
      }
    } catch {}
  }
}));

// ─ Helper to play subtle notification sound
export function playNotificationSound() {
  const { soundEnabled } = useNotificationStore.getState();
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
    console.warn('[NotificationStore] Could not play sound:', error);
  }
}