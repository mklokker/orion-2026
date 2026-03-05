/**
 * useChatNotifications — Global chat notification hook
 * Handles: document title, browser notifications, in-app toasts, debounce/grouping
 * Works from ANY page in the app (plug into Layout).
 */
import { useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "@/entities/ChatMessage";
import { ChatConversation } from "@/entities/ChatConversation";
import { playNotificationSound } from "@/components/chat/NotificationSounds";

const TITLE_BASE = document.title.replace(/^\(\d+\)\s*/, "") || "Orion";
const DEBOUNCE_MS = 3000; // group notifications within 3s per conversation

// Module-level unread counter (shared across hook instances)
let _globalUnread = 0;
const _listeners = new Set();
const notifyListeners = () => _listeners.forEach(fn => fn(_globalUnread));

export const setGlobalUnread = (count) => {
  _globalUnread = count;
  notifyListeners();
};

export const incrementGlobalUnread = (by = 1) => {
  _globalUnread += by;
  notifyListeners();
};

export const decrementGlobalUnread = (conversationId, count) => {
  _globalUnread = Math.max(0, _globalUnread - count);
  notifyListeners();
};

export function useGlobalUnreadCount(onChange) {
  useEffect(() => {
    _listeners.add(onChange);
    onChange(_globalUnread);
    return () => _listeners.delete(onChange);
  }, [onChange]);
}

// ─── Main hook ───────────────────────────────────────────────
export function useChatNotifications({
  currentUser,
  presence,
  onToast,           // (title, body, conversationId) => void
  onUnreadChange,    // (counts: { [convId]: number }) => void
  currentConversationId, // currently open conversation (skip notifications for it)
}) {
  const notifiedRef = useRef(new Set());
  const debounceTimers = useRef({});
  const pendingByConv = useRef({});
  const unreadCounts = useRef({});

  // Update document title whenever global unread changes
  useEffect(() => {
    const update = (count) => {
      document.title = count > 0 ? `(${count}) ${TITLE_BASE}` : TITLE_BASE;
    };
    _listeners.add(update);
    update(_globalUnread);
    return () => {
      _listeners.delete(update);
      document.title = TITLE_BASE;
    };
  }, []);

  const shouldSuppress = useCallback(() => {
    if (!presence) return false;
    if (presence.status === "dnd" || presence.manual_status === "dnd") return true;
    if (presence.mute_until && new Date() < new Date(presence.mute_until)) return true;
    return false;
  }, [presence]);

  const fireBrowserNotification = useCallback((title, body, convId) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!presence?.push_enabled) return;
    try {
      const n = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: `chat-${convId}`,
        renotify: true,
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (_) {}
  }, [presence]);

  const processNotification = useCallback((convId, messages, conversationName, isGroup) => {
    if (!currentUser) return;
    if (shouldSuppress()) return;

    const count = messages.length;
    const latest = messages[messages.length - 1];
    const senderName = latest.sender_name || latest.sender_email;
    const title = isGroup ? `${senderName} em ${conversationName}` : senderName;
    const body = count > 1
      ? `${count} novas mensagens`
      : (latest.type === "text" ? latest.content : "📎 Enviou um arquivo");

    // Play sound
    const soundType = presence?.notification_sound || "default";
    if (soundType !== "none") {
      playNotificationSound(soundType);
    }

    // Browser notification (if in background or other tab)
    if (document.hidden || window.location.pathname !== "/Chat") {
      fireBrowserNotification(title, body, convId);
    }

    // In-app toast
    onToast?.(title, body, convId);

    // Update unread counter
    incrementGlobalUnread(count);
  }, [currentUser, presence, shouldSuppress, fireBrowserNotification, onToast]);

  const scheduleNotification = useCallback((convId, msgData, conversationName, isGroup) => {
    if (!pendingByConv.current[convId]) {
      pendingByConv.current[convId] = [];
    }
    pendingByConv.current[convId].push(msgData);

    if (debounceTimers.current[convId]) {
      clearTimeout(debounceTimers.current[convId]);
    }

    debounceTimers.current[convId] = setTimeout(() => {
      const msgs = pendingByConv.current[convId] || [];
      pendingByConv.current[convId] = [];
      if (msgs.length > 0) {
        processNotification(convId, msgs, conversationName, isGroup);
      }
    }, DEBOUNCE_MS);
  }, [processNotification]);

  // Subscribe to real-time messages from ANY conversation
  useEffect(() => {
    if (!currentUser) return;

    const unsub = ChatMessage.subscribe(async (event) => {
      if (event.type !== "create") return;
      const msg = event.data;
      if (!msg) return;

      // Skip own messages
      if (msg.sender_email === currentUser.email) return;
      // Skip already read
      if (msg.read_by?.includes(currentUser.email)) return;
      // Skip already notified
      if (notifiedRef.current.has(msg.id)) return;
      // Skip currently open conversation
      if (msg.conversation_id === currentConversationId) return;
      // Skip deleted messages
      if (msg.is_deleted) return;

      notifiedRef.current.add(msg.id);

      // Increment local unread count for this conversation
      unreadCounts.current[msg.conversation_id] = (unreadCounts.current[msg.conversation_id] || 0) + 1;
      onUnreadChange?.({ ...unreadCounts.current });

      // Find conversation metadata for notification text
      try {
        const convs = await ChatConversation.filter({ id: msg.conversation_id });
        const conv = convs[0];
        if (!conv) return;
        if (!conv.participants?.includes(currentUser.email)) return;

        // Check if conversation is muted
        if (conv.muted_by?.includes(currentUser.email)) return;

        scheduleNotification(
          msg.conversation_id,
          msg,
          conv.name || "Conversa",
          conv.type === "group"
        );
      } catch (_) {}
    });

    return () => unsub();
  }, [currentUser, currentConversationId, scheduleNotification, onUnreadChange]);

  // Mark conversation as read and update counters
  const markConversationRead = useCallback((convId, count = 0) => {
    const prev = unreadCounts.current[convId] || 0;
    const removed = count || prev;
    delete unreadCounts.current[convId];
    onUnreadChange?.({ ...unreadCounts.current });
    decrementGlobalUnread(convId, removed);
  }, [onUnreadChange]);

  return { markConversationRead };
}