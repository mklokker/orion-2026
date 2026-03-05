/**
 * useChatNotifications — Global chat notification hook
 *
 * Layer 1 – In-app: badge on Chat nav item + toast from any page
 * Layer 2 – Cross-section: works even when user is on Tasks/Acervo/etc.
 * Layer 3 – Browser: Web Notification API (title change + OS notification)
 *
 * Usage: mount once in Layout.js via <GlobalChatNotifications />
 */
import { useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "@/entities/ChatMessage";
import { ChatConversation } from "@/entities/ChatConversation";
import { playNotificationSound } from "@/components/chat/NotificationSounds";

// ─── Module-level shared unread state ────────────────────────
let _globalUnread = 0;
const _subscribers = new Set();

export const getGlobalUnread = () => _globalUnread;

export const setGlobalUnread = (count) => {
  _globalUnread = Math.max(0, count);
  _subscribers.forEach(fn => fn(_globalUnread));
  _updateTitle();
};

export const addGlobalUnread = (n = 1) => setGlobalUnread(_globalUnread + n);
export const subtractGlobalUnread = (n = 0) => setGlobalUnread(_globalUnread - n);

export const useGlobalUnreadCount = (cb) => {
  useEffect(() => {
    _subscribers.add(cb);
    cb(_globalUnread);
    return () => _subscribers.delete(cb);
  }, [cb]);
};

function _updateTitle() {
  const base = "Orion";
  document.title = _globalUnread > 0 ? `(${_globalUnread}) ${base}` : base;
}

// ─── Main notification hook ───────────────────────────────────
const DEBOUNCE_MS = 2500;

export function useChatNotifications({
  currentUser,
  presence,
  currentConversationId, // currently open conv – skip its notifications
  onToast,               // (title, body, conversationId) => void
  onUnreadDelta,         // ({ [convId]: number }) => void – called with incremental counts
}) {
  const notifiedRef = useRef(new Set());
  const debounce = useRef({});     // { [convId]: timeoutId }
  const pending = useRef({});      // { [convId]: msg[] }

  // ── Suppress check ────────────────────────────────────────
  const isSuppressed = useCallback(() => {
    if (!presence) return false;
    if (presence.status === "dnd" || presence.manual_status === "dnd") return true;
    if (presence.mute_until && new Date() < new Date(presence.mute_until)) return true;
    return false;
  }, [presence]);

  // ── Browser Notification ───────────────────────────────────
  const fireBrowser = useCallback((title, body, convId) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (presence?.push_enabled === false) return;
    try {
      const n = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: `orion-chat-${convId}`,
        renotify: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch (_) {}
  }, [presence]);

  // ── Fire the grouped notification ─────────────────────────
  const fireGrouped = useCallback((convId, msgs, convName, isGroup) => {
    if (!currentUser || isSuppressed()) return;
    if (!msgs.length) return;

    const count = msgs.length;
    const latest = msgs[msgs.length - 1];
    const senderName = latest.sender_name || latest.sender_email;
    const title = isGroup ? `${senderName} em ${convName}` : senderName;
    const body = count > 1
      ? `${count} novas mensagens`
      : (latest.type !== "text" ? "📎 Enviou um arquivo" : (latest.content?.slice(0, 80) || ""));

    // 1. Sound
    const soundType = presence?.notification_sound || "default";
    if (soundType !== "none") playNotificationSound(soundType);

    // 2. In-app toast (any page)
    onToast?.(title, body, convId);

    // 3. Browser notification if hidden/background/other route
    const onChatPage = window.location.pathname.toLowerCase().includes("chat");
    if (!onChatPage || document.hidden) {
      fireBrowser(title, body, convId);
    }

    // 4. Update global badge counter
    addGlobalUnread(count);
  }, [currentUser, isSuppressed, presence, onToast, fireBrowser]);

  // ── Schedule debounced notification per conversation ───────
  const schedule = useCallback((convId, msg, convName, isGroup) => {
    if (!pending.current[convId]) pending.current[convId] = [];
    pending.current[convId].push(msg);

    if (debounce.current[convId]) clearTimeout(debounce.current[convId]);
    debounce.current[convId] = setTimeout(() => {
      const msgs = pending.current[convId] || [];
      pending.current[convId] = [];
      fireGrouped(convId, msgs, convName, isGroup);
    }, DEBOUNCE_MS);
  }, [fireGrouped]);

  // ── Subscribe to real-time messages ───────────────────────
  useEffect(() => {
    if (!currentUser) return;

    console.log(`[useChatNotifications] Starting subscription for ${currentUser.email}`);

    const unsub = ChatMessage.subscribe(async (event) => {
      if (event.type !== "create") return;
      const msg = event.data;
      if (!msg || !msg.id) return;

      // Own message – skip
      if (msg.sender_email === currentUser.email) return;
      // Already read – skip
      if (msg.read_by?.includes(currentUser.email)) return;
      // Deleted – skip
      if (msg.is_deleted) return;
      // Currently viewing this conversation – skip
      if (msg.conversation_id === currentConversationId) return;
      // Already notified – skip
      if (notifiedRef.current.has(msg.id)) return;

      notifiedRef.current.add(msg.id);

      // Update per-conversation unread delta (for ChatList badges)
      onUnreadDelta?.({ [msg.conversation_id]: 1 });

      // Fetch conversation for name / type / mute info
      try {
        const convs = await ChatConversation.filter({ id: msg.conversation_id });
        const conv = convs[0];
        if (!conv) return;

        // FILTRO DEFENSIVO: validar se o usuário atual é participante
        if (!conv.participants?.includes(currentUser.email)) {
          console.warn(
            `[useChatNotifications] SECURITY: Ignored message ${msg.id} from ${msg.sender_email} - ` +
            `current user ${currentUser.email} is not a participant of conversation ${msg.conversation_id}`
          );
          return;
        }

        if (conv.muted_by?.includes(currentUser.email)) return;

        const isMention = msg.content?.includes(`@${currentUser.full_name}`) ||
                          msg.content?.includes(`@${currentUser.email}`);

        let shouldNotify = true;
        if (conv.type === "group" && !isMention && presence?.notify_group_messages === false) {
          shouldNotify = false;
        }
        if (shouldNotify) {
          console.log(`[useChatNotifications] Notifying for message ${msg.id} in conversation ${msg.conversation_id}`);
          schedule(msg.conversation_id, msg, conv.name || "Conversa", conv.type === "group");
        }
      } catch (error) {
        console.error('[useChatNotifications] Error processing message:', error);
      }
    });

    return () => unsub();
  }, [currentUser, currentConversationId, schedule, onUnreadDelta, presence]);

  // ── Title cleanup on unmount ───────────────────────────────
  useEffect(() => {
    return () => { document.title = "Orion"; };
  }, []);

  return null;
}

// ── Request browser notification permission with nice UX ─────
export function requestNotificationPermission(onGranted, onDenied) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") { onGranted?.(); return; }
  if (Notification.permission === "denied") { onDenied?.(); return; }

  Notification.requestPermission().then(permission => {
    if (permission === "granted") onGranted?.();
    else onDenied?.();
  });
}