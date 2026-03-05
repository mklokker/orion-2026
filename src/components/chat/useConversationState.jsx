import { useRef, useCallback, useState, useEffect } from "react";

/**
 * Cache LRU para mensagens por conversa
 * Evita recarregar mensagens de conversas visitadas recentemente
 */
class LRUMessageCache {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  set(conversationId, messages) {
    // Remove if exists to add to end (LRU)
    if (this.cache.has(conversationId)) {
      this.cache.delete(conversationId);
    }
    this.cache.set(conversationId, messages);

    // Remove oldest if exceeded max size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  get(conversationId) {
    if (!this.cache.has(conversationId)) return null;
    // Move to end (LRU)
    const data = this.cache.get(conversationId);
    this.cache.delete(conversationId);
    this.cache.set(conversationId, data);
    return data;
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Hook para gerenciar estado de conversa com:
 * - Cache LRU de mensagens
 * - AbortController para cancelar requests
 * - Validação de respostas stale
 * - Skeleton loading ao trocar
 */
export function useConversationState() {
  const cacheRef = useRef(new LRUMessageCache(10));
  const abortControllerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Limpar AbortController ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Carrega mensagens com validação de stale response
   */
  const loadMessages = useCallback(async (conversationId, fetchFn) => {
    // Evitar recarregar a mesma conversa
    if (currentConversationId === conversationId) {
      return;
    }

    // Cancelar request anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Atualizar conversa atual
    setCurrentConversationId(conversationId);

    // Mostrar skeleton por no mínimo 200ms para UX smooth
    setIsLoading(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    try {
      // Verificar cache primeiro
      const cached = cacheRef.current.get(conversationId);
      if (cached) {
        if (signal.aborted) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[Chat] Ignorando resposta cached de ${conversationId} (stale)`);
          }
          return;
        }
        setMessages(cached);
        setIsLoading(false);
        return;
      }

      // Chamar função de fetch
      const result = await fetchFn(conversationId, signal);

      // Validar se response é stale
      if (signal.aborted) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Chat] Ignorando resposta de ${conversationId} (stale - AbortController)`);
        }
        return;
      }

      // Double-check: se a conversa mudou enquanto fetching
      if (currentConversationId !== conversationId) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Chat] Ignorando resposta de ${conversationId} (conversa mudou para ${currentConversationId})`);
        }
        return;
      }

      const msgs = Array.isArray(result) ? result : result?.messages || [];

      // Cachear
      cacheRef.current.set(conversationId, msgs);

      // Garantir skeleton mínimo de 200ms
      loadingTimeoutRef.current = setTimeout(() => {
        if (signal.aborted) return;
        setMessages(msgs);
        setIsLoading(false);
      }, 200);
    } catch (error) {
      // AbortError é normal ao trocar conversa
      if (error.name === "AbortError") {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Chat] Request cancelado para ${conversationId}`);
        }
        return;
      }

      if (signal.aborted) return;

      console.error(`[Chat] Erro ao carregar mensagens de ${conversationId}:`, error);
      setIsLoading(false);
    }
  }, [currentConversationId]);

  /**
   * Adiciona mensagem ao estado apenas se ainda é a conversa atual
   */
  const addMessage = useCallback((conversationId, message) => {
    // Validar se é da conversa atual
    if (conversationId !== currentConversationId) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Chat] Ignorando mensagem de ${conversationId} (conversa atual: ${currentConversationId})`);
      }
      return;
    }

    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });

    // Atualizar cache
    setMessages(prev => {
      cacheRef.current.set(conversationId, prev);
      return prev;
    });
  }, [currentConversationId]);

  /**
   * Atualiza mensagem apenas se é da conversa atual
   */
  const updateMessage = useCallback((conversationId, messageId, updates) => {
    if (conversationId !== currentConversationId) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Chat] Ignorando atualização de mensagem de ${conversationId}`);
      }
      return;
    }

    setMessages(prev => {
      const updated = prev.map(m => m.id === messageId ? { ...m, ...updates } : m);
      cacheRef.current.set(conversationId, updated);
      return updated;
    });
  }, [currentConversationId]);

  /**
   * Remove mensagem apenas se é da conversa atual
   */
  const removeMessage = useCallback((conversationId, messageId) => {
    if (conversationId !== currentConversationId) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Chat] Ignorando remoção de mensagem de ${conversationId}`);
      }
      return;
    }

    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== messageId);
      cacheRef.current.set(conversationId, filtered);
      return filtered;
    });
  }, [currentConversationId]);

  /**
   * Reseta estado ao desmontar ou limpar
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setMessages([]);
    setIsLoading(false);
    setCurrentConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    currentConversationId,
    loadMessages,
    addMessage,
    updateMessage,
    removeMessage,
    reset,
    clearCache: () => cacheRef.current.clear()
  };
}