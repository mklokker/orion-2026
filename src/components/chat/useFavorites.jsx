import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const ChatMessageFavorite = base44.entities.ChatMessageFavorite;

// In-memory cache per user session
let _cache = null; // Set of message_ids
let _records = null; // Array of favorite records
let _listeners = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

export function useFavorites(userEmail) {
  const [favoritedIds, setFavoritedIds] = useState(() => _cache ? new Set(_cache) : new Set());
  const [records, setRecords] = useState(() => _records || []);
  const [loading, setLoading] = useState(!_cache);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const favs = await ChatMessageFavorite.filter({ user_email: userEmail }, "-created_date", 200);
      _records = favs;
      _cache = favs.map(f => f.message_id);
      if (mountedRef.current) {
        setRecords(favs);
        setFavoritedIds(new Set(_cache));
      }
      notifyListeners();
    } catch (e) {
      console.error("Erro ao carregar favoritos:", e);
    }
    if (mountedRef.current) setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    if (!_cache) {
      refresh();
    }
    const listener = () => {
      if (mountedRef.current) {
        setFavoritedIds(new Set(_cache || []));
        setRecords([...(_records || [])]);
      }
    };
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, [userEmail, refresh]);

  const toggleFavorite = useCallback(async (message, conversationName = "") => {
    if (!userEmail || !message?.id) return false;

    const isFav = (_cache || []).includes(message.id);

    if (isFav) {
      // Optimistic remove
      _cache = (_cache || []).filter(id => id !== message.id);
      const removed = _records?.find(r => r.message_id === message.id);
      _records = (_records || []).filter(r => r.message_id !== message.id);
      notifyListeners();

      // Server remove
      try {
        if (removed) await ChatMessageFavorite.delete(removed.id);
      } catch (e) {
        // rollback
        if (removed) {
          _cache = [...(_cache || []), message.id];
          _records = [...(_records || []), removed];
          notifyListeners();
        }
        throw e;
      }
      return false; // now unfavorited
    } else {
      // Build snapshot
      const snapshot = {
        content_preview: message.type === "text"
          ? (message.content || "").substring(0, 200)
          : message.type === "image" ? "📷 Imagem"
          : message.type === "gif" ? "🎞 GIF"
          : `📎 ${message.file_name || "Arquivo"}`,
        type: message.type,
        file_name: message.file_name || null,
        file_url: message.file_url || null,
        gif_url: message.gif_url || null,
        sender_name: message.sender_name || message.sender_email,
        sent_at: message.created_date,
        conversation_name: conversationName,
      };

      const tempRecord = {
        id: `temp_${message.id}`,
        user_email: userEmail,
        message_id: message.id,
        conversation_id: message.conversation_id,
        created_date: new Date().toISOString(),
        snapshot,
      };

      // Optimistic add
      _cache = [...(_cache || []), message.id];
      _records = [tempRecord, ...(_records || [])];
      notifyListeners();

      // Server create
      try {
        const created = await ChatMessageFavorite.create({
          user_email: userEmail,
          message_id: message.id,
          conversation_id: message.conversation_id,
          snapshot,
        });
        // Replace temp with real
        _records = (_records || []).map(r => r.id === tempRecord.id ? created : r);
        notifyListeners();
      } catch (e) {
        // rollback
        _cache = (_cache || []).filter(id => id !== message.id);
        _records = (_records || []).filter(r => r.id !== tempRecord.id);
        notifyListeners();
        throw e;
      }
      return true; // now favorited
    }
  }, [userEmail]);

  const isFavorited = useCallback((messageId) => {
    return favoritedIds.has(messageId);
  }, [favoritedIds]);

  return { favoritedIds, records, loading, toggleFavorite, isFavorited, refresh };
}

// Reset cache on logout/user change
export function resetFavoritesCache() {
  _cache = null;
  _records = null;
  notifyListeners();
}