import React, { useState, useEffect, useRef } from "react";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { Notification as NotificationEntity } from "@/entities/Notification"; // Changed import alias
import { AppSettings } from "@/entities/AppSettings"; // New import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Users, 
  Plus,
  Search,
  X,
  File,
  Check,
  CheckCheck,
  Trash2,
  Globe,
  Lock,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Bell,
  Settings,
  Download,
  MoreVertical,
  Reply,
  Smile,
  Edit2
} from "lucide-react";
import GroupSettingsModal from "@/components/chat/GroupSettingsModal";
import ChatSettingsModal from "@/components/chat/ChatSettingsModal";
import ChatInputArea from "@/components/chat/ChatInputArea";
import MessageBubble from "@/components/chat/MessageBubble";
import { useToast } from "@/components/ui/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getPublicUsers } from "@/functions/getPublicUsers";
import { useQueryClient } from "@tanstack/react-query";
import { useConversations, useMessages, useTypingStatus, useOnlineStatusUpdater, useUnreadChatCounts } from "@/components/chat/useChat";

// Função para converter para timezone de São Paulo (UTC-3)
const toSaoPauloTime = (date) => {
  // Converte para string no timezone de São Paulo
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
};

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getUserDisplayName = (user) => {
  return user?.display_name || user?.full_name || user?.email || "Usuário";
};

const formatMessageTime = (dateString) => {
  try {
    const date = new Date(dateString);
    return format(toSaoPauloTime(date), "HH:mm", { locale: ptBR });
  } catch (error) {
    return "";
  }
};

const formatConversationTime = (dateString) => {
  try {
    const date = new Date(dateString);
    const spDate = toSaoPauloTime(date);
    const now = toSaoPauloTime(new Date());
    
    // Se for hoje, mostrar apenas hora
    if (format(spDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
      return format(spDate, "HH:mm", { locale: ptBR });
    }
    
    // Se for essa semana, mostrar dia da semana
    return format(spDate, "dd/MM HH:mm", { locale: ptBR });
  } catch (error) {
    return "";
  }
};

const formatLastSeen = (lastSeenStr) => {
  if (!lastSeenStr) return "Nunca visto";
  try {
    const lastSeen = new Date(lastSeenStr);
    return formatDistanceToNow(lastSeen, { addSuffix: true, locale: ptBR });
  } catch {
    return "Nunca visto";
  }
};

export default function Chat() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  
  const { data: conversations = [] } = useConversations(currentUser?.email);
  const { data: chatData } = useUnreadChatCounts(currentUser?.email); // Use unread counts
  const unreadByConversation = chatData?.unreadByConversation || {};

  const { data: messagesData = [] } = useMessages(selectedConversation?.id);
  
  const [messages, setMessages] = useState([]);
  const previousMessagesCountRef = useRef(0);
  
  useEffect(() => {
    if (messagesData) setMessages(messagesData);
  }, [messagesData]);

  // Push Notifications for new messages
  useEffect(() => {
    if (!messagesData || messagesData.length === 0 || !currentUser) return;
    
    const newMessagesCount = messagesData.length;
    const hadPreviousMessages = previousMessagesCountRef.current > 0;
    
    // Check if there are new messages
    if (hadPreviousMessages && newMessagesCount > previousMessagesCountRef.current) {
      const newMessages = messagesData.slice(previousMessagesCountRef.current);
      
      // Only notify for messages from others
      newMessages.forEach(msg => {
        if (msg.sender_email !== currentUser.email) {
          const prefs = currentUser.chat_preferences || {};
          
          // Check Do Not Disturb
          if (prefs.dnd_until && new Date(prefs.dnd_until) > new Date()) {
            return;
          }
          
          // Check conversation type permissions
          const convType = selectedConversation?.conversation_type;
          if (convType === 'direct' && prefs.notify_direct === false) return;
          if ((convType === 'group' || convType === 'department') && prefs.notify_group === false) return;
          
          // Show desktop notification
          showDesktopNotification(
            msg.sender_name || msg.sender_email,
            msg.message || "[Arquivo enviado]",
            null
          );
        }
      });
    }
    
    previousMessagesCountRef.current = newMessagesCount;
  }, [messagesData, currentUser, selectedConversation]);

  const { setTyping, typingUsers: typingUsersList } = useTypingStatus(selectedConversation?.id, currentUser?.email);
  const typingUsers = new Set(typingUsersList);
  
  useOnlineStatusUpdater(currentUser?.email);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatType, setNewChatType] = useState("direct");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [isPublicGroup, setIsPublicGroup] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // State for reply
  const scrollRef = useRef(null);
  
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [appSettings, setAppSettings] = useState(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false); // Group settings modal state
  const [showChatSettings, setShowChatSettings] = useState(false); // User chat settings
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Check group permissions for current user
  const groupPermissions = selectedConversation?.permissions || {};
  const groupAdmins = selectedConversation?.admins || (selectedConversation?.created_by ? [selectedConversation.created_by] : []);
  const isGroupAdmin = groupAdmins.includes(currentUser?.email) || selectedConversation?.created_by === currentUser?.email || isAdmin;

  const canSendMessage = !selectedConversation || 
                         selectedConversation.conversation_type === 'direct' || 
                         !groupPermissions.only_admins_message || 
                         isGroupAdmin;

  useEffect(() => {
    loadInitialData();
  }, []);

  // Função para rolar para o final
  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  // Scroll ao receber novas mensagens
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  // Scroll imediato ao selecionar conversa - melhorado com múltiplos frames
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Use requestAnimationFrame duplo para garantir que o DOM foi totalmente renderizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
          }
        });
      });
    }
  }, [selectedConversation?.id, messages.length]);

  useEffect(() => {
    loadAppSettings();
    checkNotificationPermission();
  }, []);

  const loadAppSettings = async () => {
    try {
      const settingsData = await AppSettings.list();
      if (settingsData.length > 0) {
        setAppSettings(settingsData[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const checkNotificationPermission = async () => {
    if (typeof Notification === 'undefined' || !("Notification" in window)) {
      console.warn("Este navegador não suporta notificações");
      return;
    }
    
    setNotificationPermission(Notification.permission);
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined' || !("Notification" in window)) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações.",
        variant: "destructive"
      });
      return;
    }

    if (Notification.permission === "granted") {
      toast({
        title: "Já autorizado",
        description: "Você já autorizou as notificações.",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        toast({
          title: "Notificações ativadas!",
          description: "Você receberá notificações de novas mensagens.",
        });
        playNotificationSound();
      } else {
        toast({
          title: "Notificações bloqueadas",
          description: "Você não receberá notificações de mensagens.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar permissão para notificações.",
        variant: "destructive"
      });
    }
  };

  const playNotificationSound = () => {
    // Check user preferences first, then app settings
    const userSound = currentUser?.chat_preferences?.notification_sound;
    const appSound = appSettings?.notification_sound;
    const soundType = userSound || appSound || 'default';
    
    if (soundType === 'none') return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API is not supported in this browser.");
      return;
    }
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    
    switch(soundType) {
      case 'chime':
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case 'bell':
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        oscillator.stop(audioContext.currentTime + 0.8);
        break;
      case 'pop':
        oscillator.frequency.value = 600;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'ding':
        oscillator.frequency.value = 1200;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'default':
      default:
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
    }
  };

  const showDesktopNotification = (title, body, icon) => {
    if (typeof Notification === 'undefined' || Notification.permission !== "granted") {
      return;
    }

    // Don't show notification if user is actively viewing the page and conversation
    if (document.hasFocus() && document.visibilityState === 'visible') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chat-message',
        requireInteraction: false,
        silent: true, // We handle sound separately
        vibrate: [200, 100, 200]
      });

      playNotificationSound();

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000);
    } catch (error) {
      console.error("Erro ao mostrar notificação:", error);
    }
  };

  const updateOnlineStatus = async () => {
    if (!currentUser?.email) return;
    
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.auth.updateMe({
        last_seen: new Date().toISOString(),
        is_online: true
      });
    } catch (error) {
      // Silenciar
    }
  };

  // FUNÇÃO SIMPLIFICADA: Gera objeto user sem fazer chamadas API
  const generateUserFromEmail = (email) => {
    const namePart = email.split('@')[0];
    const displayName = namePart
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return {
      id: `generated-${Date.now()}-${email}`,
      email: email,
      display_name: displayName,
      full_name: displayName,
      role: "user",
      profile_picture: null
    };
  };

  // NOVA FUNÇÃO: Enriquece dados de usuários com informações reais da API
  const enrichUserData = async (email, existingUser = null) => {
    try {
      // Tenta buscar dados reais do usuário
      const { base44 } = await import("@/api/base44Client");
      const userData = await base44.entities.User.filter({ email: email });
      
      if (userData && userData.length > 0) {
        const realUser = userData[0];
        console.log(`[Chat] ✅ Dados reais carregados para ${email}:`, {
          has_display_name: !!realUser.display_name,
          has_full_name: !!realUser.full_name,
          has_picture: !!realUser.profile_picture
        });
        
        return {
          ...realUser,
          display_name: realUser.display_name || realUser.full_name || email,
          email: email // Garante que o email está sempre presente
        };
      }
    } catch (error) {
      // Se falhar (ex: rate limit, permissão), usa dados existentes ou gera novos
      console.warn(`[Chat] ⚠️ Não foi possível enriquecer dados de ${email}:`, error.message);
    }
    
    // Fallback: retorna dados existentes ou gera novo
    return existingUser || generateUserFromEmail(email);
  };

  // FUNÇÃO OTIMIZADA: Enriquece múltiplos usuários com controle de rate limit
  const enrichMultipleUsers = async (emailsToEnrich, existingUsersMap) => {
    const enrichedUsers = [];
    const BATCH_SIZE = 3; // Processa 3 por vez para evitar rate limit
    const DELAY_MS = 500; // 500ms entre lotes
    
    console.log(`[Chat] 🔄 Enriquecendo dados de ${emailsToEnrich.length} usuários...`);
    
    for (let i = 0; i < emailsToEnrich.length; i += BATCH_SIZE) {
      const batch = emailsToEnrich.slice(i, 0 + BATCH_SIZE);
      
      const batchPromises = batch.map(email => 
        enrichUserData(email, existingUsersMap.get(email))
      );
      
      const batchResults = await Promise.all(batchPromises);
      enrichedUsers.push(...batchResults);
      
      // Delay entre lotes (exceto no último)
      if (i + BATCH_SIZE < emailsToEnrich.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
    
    console.log(`[Chat] ✅ Enriquecimento concluído:`, {
      total: enrichedUsers.length,
      with_picture: enrichedUsers.filter(u => u.profile_picture).length,
      with_display_name: enrichedUsers.filter(u => u.display_name && !u.id?.startsWith('generated-')).length
    });
    
    return enrichedUsers;
  };

  // FUNÇÃO OTIMIZADA: Não faz chamadas API extras
  const discoverAndAddUser = async (email) => {
    const exists = users.find(u => u.email === email);
    if (exists) {
      return exists;
    }
    
    console.log(`[Chat] 🆕 Adicionando usuário descoberto: ${email}`);
    const newUser = generateUserFromEmail(email);
    
    setUsers(prevUsers => [...prevUsers, newUser]);
    
    const cachedUsers = JSON.parse(localStorage.getItem('chat_users_cache') || '[]');
    if (!cachedUsers.find(u => u.email === email)) {
      cachedUsers.push(newUser);
      localStorage.setItem('chat_users_cache', JSON.stringify(cachedUsers));
    }
    
    return newUser;
  };

  const loadInitialData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      await updateOnlineStatus();

      const cachedUsers = localStorage.getItem('chat_users_cache');
      const cacheTimestamp = localStorage.getItem('chat_cache_timestamp');
      const now = Date.now();

      const isUserAdmin = userData.role === 'admin';

      if (isUserAdmin) {
        console.log("[Chat] 👑 Admin detectado, carregando lista completa...");
        
        if (cachedUsers) {
          const parsedUsers = JSON.parse(cachedUsers);
          console.log(`[Chat] 📦 Usando ${parsedUsers.length} usuários do cache temporariamente...`);
          setUsers(parsedUsers);
        }

        try {
          // Admin: Tenta função backend primeiro, depois User.list()
          let usersData = [];
          
          try {
            console.log("[Chat] 🔄 Admin: tentando função backend...");
            const response = await getPublicUsers();
            if (response.data?.users) {
              usersData = response.data.users;
              console.log(`[Chat] ✅ ${usersData.length} usuários via backend function`);
            } else {
              throw new Error("Resposta inválida da função backend para admin.");
            }
          } catch (backendError) {
            console.warn("[Chat] ⚠️ Backend function falhou, usando User.list():", backendError.message);
            usersData = await User.list();
            console.log(`[Chat] ✅ ${usersData.length} usuários via User.list()`);
          }
          
          const normalizedUsers = usersData.map(u => ({
            ...u,
            display_name: u.display_name || u.full_name || u.email
          }));
          
          setUsers(normalizedUsers);
          localStorage.setItem('chat_users_cache', JSON.stringify(normalizedUsers));
          localStorage.setItem('chat_cache_timestamp', now.toString());
        } catch (error) {
          console.error("[Chat] ❌ Erro ao carregar usuários (Admin):", error.message);
          
          if (cachedUsers) {
            console.log("[Chat] ✓ Mantendo cache após falha");
          } else {
            console.warn("[Chat] ⚠️ Sem cache, usando apenas admin");
            setUsers([userData]);
          }
        }
      } else {
        console.log("[Chat] 👤 Usuário comum detectado, usando função backend...");
        
        try {
          // Usuário comum: Usa APENAS a função backend
          console.log("[Chat] 🔄 Carregando usuários via backend function...");
          const response = await getPublicUsers();
          
          if (response.data?.users) {
            const usersData = response.data.users.map(u => ({
              ...u,
              display_name: u.display_name || u.full_name || u.email
            }));
            
            setUsers(usersData);
            localStorage.setItem('chat_users_cache', JSON.stringify(usersData));
            localStorage.setItem('chat_cache_timestamp', now.toString());
            
            console.log(`[Chat] ✅ ${usersData.length} usuários carregados via backend`);
            console.log(`[Chat] 📊 ${usersData.filter(u => u.profile_picture).length} com foto`);
          } else {
            throw new Error("Resposta inválida da função backend");
          }
          
        } catch (error) {
          console.error("[Chat] ❌ Erro ao usar backend function (Usuário comum):", error);
          
          // Fallback: usa cache ou descobre via conversas
          if (cachedUsers) {
            setUsers(JSON.parse(cachedUsers));
            console.log("[Chat] ✓ Usando cache como fallback");
          } else {
            console.log("[Chat] 🔄 Descobrindo usuários das conversas (fallback)...");
            const allConversations = await ChatConversation.list("-last_message_date");
            
            const uniqueEmails = new Set();
            uniqueEmails.add(userData.email);
            
            for (const conv of allConversations) {
              if (conv.participants) {
                conv.participants.forEach(email => uniqueEmails.add(email));
              }
            }
            
            const fallbackUsers = Array.from(uniqueEmails).map((email) => {
              return generateUserFromEmail(email);
            });
            
            setUsers(fallbackUsers);
            localStorage.setItem('chat_users_cache', JSON.stringify(fallbackUsers));
            localStorage.setItem('chat_cache_timestamp', now.toString());
            console.log(`[Chat] ✅ ${fallbackUsers.length} usuários via fallback`);
          }
        }
      }

      const cachedDepartments = localStorage.getItem('chat_departments_cache');
      const CACHE_DURATION = 24 * 60 * 60 * 1000;
      const cacheValid = cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION;

      if (cacheValid && cachedDepartments) {
        setDepartments(JSON.parse(cachedDepartments));
        console.log("[Chat] ✓ Usando cache de departamentos");
      } else {
        try {
          const departmentsData = await Department.list();
          setDepartments(departmentsData);
          localStorage.setItem('chat_departments_cache', JSON.stringify(departmentsData));
        } catch (error) {
          console.error("[Chat] Erro ao carregar departamentos:", error);
          setDepartments([]);
        }
      }
      
      // loadConversations(userData.email); // Handled by hook
    } catch (error) {
      if (error?.response?.status !== 429) {
        console.error("[Chat] Erro ao carregar dados iniciais:", error);
      }
    }
  };

  const loadConversations = async (userEmail = currentUser?.email) => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const loadMessages = async (conversationId) => {
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    
    // Optimistically mark as read in UI
    const unreadCount = unreadByConversation[conversation.id] || 0;
    if (unreadCount > 0) {
      // Update cache optimistically
      queryClient.setQueryData(['unreadChatCounts', currentUser?.email], (old) => {
        if (!old) return old;
        const newUnreadByConv = { ...old.unreadByConversation };
        delete newUnreadByConv[conversation.id]; // Remove unread count for this conv
        
        return {
          ...old,
          totalUnread: Math.max(0, old.totalUnread - unreadCount),
          unreadByConversation: newUnreadByConv
        };
      });

      // Trigger backend update
      try {
        const { base44 } = await import("@/api/base44Client");
        await base44.functions.invoke('markConversationAsRead', { conversation_id: conversation.id });
      } catch (error) {
        console.error("Failed to mark messages as read", error);
      }
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        name: match[1],
        email: match[2]
      });
    }
    
    return mentions;
  };

  // Função genérica de envio que adapta para o novo componente ChatInputArea
  const handleSendMessage = async ({ type, content, attachmentUrl, attachmentName, documentId }) => {
    if (!selectedConversation) return;

    const messageData = {
      conversation_id: selectedConversation.id,
      sender_email: currentUser.email,
      sender_name: getUserDisplayName(currentUser),
      message: content || (attachmentUrl ? attachmentName : ""),
      message_type: type || 'text',
      read_by: [currentUser.email],
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      document_id: documentId
    };

    if (replyTo) {
      messageData.reply_to_id = replyTo.id;
      messageData.reply_to_content = {
        sender_name: replyTo.sender_name,
        message: replyTo.message,
        type: replyTo.message_type
      };
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      ...messageData,
      id: tempId,
      created_date: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setReplyTo(null);

    try {
      const createdMessage = await ChatMessage.create(messageData);
      setMessages(prev => prev.map(m => m.id === tempId ? createdMessage : m));

      // Atualizar conversa (Last message)
      const lastMsgText = type === 'text' ? content : `[${type === 'image' ? 'Imagem' : type === 'audio' ? 'Áudio' : 'Arquivo'}]`;
      
      await ChatConversation.update(selectedConversation.id, {
        last_message: lastMsgText,
        last_message_date: new Date().toISOString(),
        last_message_by: currentUser.email
      });
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Notificações (Lógica simplificada para não repetir código - ideal seria uma função separada)
      const otherParticipants = selectedConversation.participants?.filter(p => p !== currentUser.email) || [];
      for (const participantEmail of otherParticipants) {
        // Evitar notificar se estiver online na mesma conversa (otimização futura)
        NotificationEntity.create({
          user_email: participantEmail,
          title: getUserDisplayName(currentUser),
          message: lastMsgText,
          type: "interaction",
          action_by: currentUser.email,
          action_by_name: getUserDisplayName(currentUser),
          read: false
        }).catch(console.error);
      }

    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  // Actions for Messages
  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleDeleteMessage = async (message, forAll) => {
    try {
      if (forAll) {
        await ChatMessage.update(message.id, { is_deleted_for_all: true });
      } else {
        const deletedFor = [...(message.deleted_for || []), currentUser.email];
        await ChatMessage.update(message.id, { deleted_for: deletedFor });
      }
      loadMessages(selectedConversation.id); // Refresh
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao apagar mensagem", variant: "destructive" });
    }
  };

  const handleReact = async (message, emoji) => {
    try {
      const currentReactions = message.reactions || {};
      const usersReacted = currentReactions[emoji] || [];
      
      let newUsersReacted;
      if (usersReacted.includes(currentUser.email)) {
        newUsersReacted = usersReacted.filter(e => e !== currentUser.email);
      } else {
        newUsersReacted = [...usersReacted, currentUser.email];
      }
      
      const newReactions = {
        ...currentReactions,
        [emoji]: newUsersReacted
      };
      
      // Clean empty arrays
      if (newUsersReacted.length === 0) delete newReactions[emoji];

      // Optimistic UI update
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: newReactions } : m));
      
      await ChatMessage.update(message.id, { reactions: newReactions });
    } catch (error) {
      console.error("Reaction failed", error);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      // Check for URLs and extract link preview
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = editText.match(urlRegex);
      let linkPreview = null;

      if (urls && urls.length > 0) {
        try {
          const { base44 } = await import("@/api/base44Client");
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Extract metadata from this URL: ${urls[0]}. Return JSON with: title, description, image (og:image or first image URL), site_name. If you can't access it, return null for unavailable fields.`,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                image: { type: "string" },
                site_name: { type: "string" }
              }
            }
          });

          if (response && (response.title || response.description)) {
            linkPreview = {
              url: urls[0],
              ...response
            };
          }
        } catch (error) {
          console.warn("Failed to fetch link preview:", error);
        }
      }

      const updateData = {
        message: editText,
        is_edited: true,
        edited_at: new Date().toISOString()
      };

      if (linkPreview) {
        updateData.link_preview = linkPreview;
      }

      await ChatMessage.update(editingMessage.id, updateData);
      
      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id ? { ...m, ...updateData } : m
      ));
      
      setEditingMessage(null);
      setEditText("");
      
      toast({
        title: "Mensagem editada",
        description: "Sua mensagem foi atualizada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível editar a mensagem.",
        variant: "destructive"
      });
    }
  };

  const handlePinMessage = async (message) => {
    try {
      const newPinnedState = !message.is_pinned;
      
      await ChatMessage.update(message.id, {
        is_pinned: newPinnedState,
        pinned_by: newPinnedState ? currentUser.email : null,
        pinned_at: newPinnedState ? new Date().toISOString() : null
      });
      
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { 
          ...m, 
          is_pinned: newPinnedState,
          pinned_by: newPinnedState ? currentUser.email : null,
          pinned_at: newPinnedState ? new Date().toISOString() : null
        } : m
      ));
      
      toast({
        title: newPinnedState ? "Mensagem fixada" : "Mensagem desafixada",
        description: newPinnedState ? "A mensagem foi fixada no topo da conversa." : "A mensagem foi desafixada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fixar/desafixar a mensagem.",
        variant: "destructive"
      });
    }
  };


  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await handleSendMessage(file_url, file.name);
      
      toast({
        title: "Sucesso!",
        description: "Arquivo enviado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivo.",
        variant: "destructive"
      });
    }
    setUploadingFile(false);
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewMessage(value);
    setCursorPosition(cursorPos);

    // Typing indicator logic
    if (value.trim()) {
      setIsTyping(true);
      setTyping(); // Call hook mutation
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
    
    // Mention logic (keep existing)
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        
        const filtered = users.filter(u => 
          u.email !== currentUser?.email &&
          (getUserDisplayName(u).toLowerCase().includes(textAfterAt.toLowerCase()) ||
           u.email.toLowerCase().includes(textAfterAt.toLowerCase()))
        ).slice(0, 5);
        
        setMentionSuggestions(filtered);
        setShowMentionSuggestions(filtered.length > 0);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleMentionSelect = (user) => {
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = newMessage.substring(0, lastAtIndex);
      const afterCursor = newMessage.substring(cursorPosition);
      
      const mention = `@[${getUserDisplayName(user)}](${user.email})`;
      const newText = beforeAt + mention + " " + afterCursor;
      
      setNewMessage(newText);
      setShowMentionSuggestions(false);
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const renderMessageText = (text) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      parts.push(
        <Badge key={match.index} className="bg-blue-500 text-white mx-1">
          @{match[1]}
        </Badge>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const canDeleteConversation = (conversation) => {
    if (!conversation || !currentUser) return false;
    
    // Admin pode deletar qualquer conversa
    if (isAdmin) return true;
    
    // Usuário pode deletar apenas conversas diretas onde é participante
    if (conversation.conversation_type === "direct") {
      return conversation.participants?.includes(currentUser.email);
    }
    
    // Usuário pode deletar grupos que criou (não públicos)
    if (conversation.conversation_type === "group" && !conversation.is_public) {
      return conversation.created_by === currentUser.email;
    }
    
    return false;
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      // CORRIGIDO: Verificar se a conversa ainda existe antes de deletar
      const exists = conversations.find(c => c.id === conversationToDelete.id);
      
      if (!exists) {
        toast({
          title: "Conversa não encontrada",
          description: "Esta conversa já foi excluída ou não existe mais.",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        setConversationToDelete(null);
        await loadConversations();
        return;
      }

      await ChatConversation.delete(conversationToDelete.id);
      
      toast({
        title: "Sucesso!",
        description: "Conversa excluída com sucesso.",
      });
      
      setShowDeleteDialog(false);
      setConversationToDelete(null);
      
      if (selectedConversation?.id === conversationToDelete.id) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      await loadConversations();
    } catch (error) {
      console.error("Erro ao deletar conversa:", error);
      
      // MELHOR: Tratamento específico para 404
      if (error?.response?.status === 404) {
        toast({
          title: "Conversa não encontrada",
          description: "Esta conversa já foi excluída.",
        });
        
        // Limpar estado mesmo se já foi deletada
        setShowDeleteDialog(false);
        setConversationToDelete(null);
        
        if (selectedConversation?.id === conversationToDelete.id) {
          setSelectedConversation(null);
          setMessages([]);
        }
        
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao deletar conversa.",
          variant: "destructive"
        });
      }
    }
  };

  const handlePinConversation = async (conversation, e) => {
    if (e) e.stopPropagation();
    
    try {
      const pinnedBy = conversation.pinned_by || [];
      const isPinned = pinnedBy.includes(currentUser.email);
      
      const updatedPinnedBy = isPinned
        ? pinnedBy.filter(email => email !== currentUser.email)
        : [...new Set([...pinnedBy, currentUser.email])]; // Use Set to avoid duplicates
      
      await ChatConversation.update(conversation.id, {
        pinned_by: updatedPinnedBy
      });
      
      toast({
        title: isPinned ? "Conversa desafixada" : "Conversa fixada",
        description: isPinned ? "Conversa removida do topo" : "Conversa fixada no topo da lista",
      });
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error("Erro ao fixar/desafixar conversa:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar conversa.",
        variant: "destructive"
      });
    }
  };

  const handleArchiveConversation = async (conversation, e) => {
    if (e) e.stopPropagation();
    
    try {
      const archivedBy = conversation.archived_by || [];
      const isArchived = archivedBy.includes(currentUser.email);
      
      const updatedArchivedBy = isArchived
        ? archivedBy.filter(email => email !== currentUser.email)
        : [...new Set([...archivedBy, currentUser.email])]; // Use Set to avoid duplicates
      
      await ChatConversation.update(conversation.id, {
        archived_by: updatedArchivedBy
      });
      
      toast({
        title: isArchived ? "Conversa desarquivada" : "Conversa arquivada",
        description: isArchived ? "Conversa restaurada para a lista principal" : "Conversa movida para arquivados",
      });
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      if (selectedConversation?.id === conversation.id && !isArchived) { // If archived, deselect it
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Erro ao arquivar/desarquivar conversa:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar conversa.",
        variant: "destructive"
      });
    }
  };

  const handleCreateConversation = async () => {
    // DEBUG: Log para investigar
    console.log("[Chat] 🔍 handleCreateConversation chamado");
    console.log("[Chat] Tipo de chat:", newChatType);
    console.log("[Chat] Usuários selecionados:", selectedUsers);
    console.log("[Chat] Total de usuários disponíveis:", users.length);
    console.log("[Chat] Lista de usuários:", users.map(u => `${u.email} (${u.display_name || u.full_name})`));
    console.log("[Chat] Usuário atual:", currentUser?.email, "- Role:", currentUser?.role);
    
    if (newChatType === "direct" && selectedUsers.length !== 1) {
      console.error("[Chat] ❌ Erro: Usuário não selecionado para chat direto");
      toast({
        title: "Erro",
        description: "Selecione exatamente 1 usuário para chat direto.",
        variant: "destructive"
      });
      return;
    }

    if (newChatType === "group" && (selectedUsers.length < 1 || !groupName.trim())) {
      console.error("[Chat] ❌ Erro: Grupo sem usuários ou nome");
      toast({
        title: "Erro",
        description: "Dê um nome ao grupo e selecione pelo menos 1 usuário.",
        variant: "destructive"
      });
      return;
    }

    if (newChatType === "department" && !selectedDepartment) {
      console.error("[Chat] ❌ Erro: Departamento não selecionado");
      toast({
        title: "Erro",
        description: "Selecione um departamento.",
        variant: "destructive"
      });
      return;
    }

    // Apenas admins podem criar grupos públicos
    if (isPublicGroup && newChatType === "group" && !isAdmin) {
      console.error("[Chat] ❌ Erro: Não-admin tentando criar grupo público");
      toast({
        title: "Erro",
        description: "Apenas administradores podem criar grupos públicos.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("[Chat] ✓ Validações passaram, criando conversa...");
      
      let participants = [currentUser.email, ...selectedUsers];
      let conversationName = null;
      let departmentId = null;

      if (newChatType === "group") {
        conversationName = groupName.trim();
        if (isPublicGroup) {
          participants = users.map(u => u.email);
        }
      } else if (newChatType === "department") {
        departmentId = selectedDepartment;
        const dept = departments.find(d => d.id === selectedDepartment);
        conversationName = `Departamento: ${dept?.name}`;
        participants = users.map(u => u.email);
      }

      if (newChatType === "direct") {
        const existing = conversations.find(conv => 
          conv.conversation_type === "direct" &&
          conv.participants?.length === 2 &&
          conv.participants?.includes(selectedUsers[0]) &&
          conv.participants?.includes(currentUser.email)
        );

        if (existing) {
          console.log("[Chat] ✓ Conversa direta já existe, abrindo...");
          setShowNewChatDialog(false);
          handleSelectConversation(existing);
          return;
        }
      }

      console.log("[Chat] 🚀 Criando nova conversa com dados:", {
        name: conversationName,
        conversation_type: newChatType,
        is_public: isPublicGroup && newChatType === "group",
        participants: participants,
        department_id: departmentId,
        created_by: currentUser.email
      });

      const newConversation = await ChatConversation.create({
      name: conversationName,
      conversation_type: newChatType,
      is_public: isPublicGroup && newChatType === "group",
      participants: participants,
      department_id: departmentId,
      created_by: currentUser.email,
      admins: [currentUser.email], // Creator is first admin
      permissions: {
         only_admins_message: false,
         only_admins_edit_info: false
      }
      });

      console.log("[Chat] ✅ Conversa criada com sucesso! ID:", newConversation.id);

      toast({
        title: "Sucesso!",
        description: isPublicGroup ? "Grupo público criado! Todos os usuários foram adicionados automaticamente." : "Conversa criada com sucesso.",
      });

      setShowNewChatDialog(false);
      setSelectedUsers([]);
      setGroupName("");
      setIsPublicGroup(false);
      setSelectedDepartment("");
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      handleSelectConversation(newConversation);
    } catch (error) {
      console.error("[Chat] ❌ ERRO ao criar conversa:", error);
      console.error("[Chat] Detalhes:", error.message);
      toast({
        title: "Erro",
        description: "Erro ao criar conversa: " + (error.message || "Desconhecido"),
        variant: "destructive"
      });
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.name) return conversation.name;
    
    if (conversation.conversation_type === "direct") {
      const otherUserEmail = conversation.participants?.find(p => p !== currentUser?.email);
      const otherUser = users.find(u => u.email === otherUserEmail);
      return getUserDisplayName(otherUser) || otherUserEmail;
    }
    
    return "Conversa sem nome";
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.conversation_type === "direct") {
      const otherUserEmail = conversation.participants?.find(p => p !== currentUser?.email);
      const otherUser = users.find(u => u.email === otherUserEmail);
      return {
        src: otherUser?.profile_picture,
        initials: getInitials(getUserDisplayName(otherUser)),
        isGroup: false,
        user: otherUser
      };
    }

    return {
      src: conversation.group_image || null,
      initials: getInitials(conversation.name || "Grupo"),
      isGroup: true,
      user: null
    };
  };

  const getUnreadCount = (conversationId) => {
    return unreadByConversation[conversationId] || 0;
  };

  const isMessageReadByOthers = (message) => {
    if (message.sender_email !== currentUser?.email) return { isRead: false, isReadByAll: false, readCount: 0, totalCount: 0 };
    
    const otherParticipants = selectedConversation?.participants?.filter(
      p => p !== currentUser.email
    ) || [];
    
    if (otherParticipants.length === 0) return { isRead: false, isReadByAll: false, readCount: 0, totalCount: 0 };
    
    const readByOthers = otherParticipants.filter(email => 
      message.read_by?.includes(email)
    );
    
    return {
      isRead: readByOthers.length > 0,
      isReadByAll: readByOthers.length === otherParticipants.length,
      readCount: readByOthers.length,
      totalCount: otherParticipants.length
    };
  };

  const isConversationPinned = (conversation) => {
    return conversation.pinned_by?.includes(currentUser?.email) || false;
  };

  const isConversationArchived = (conversation) => {
    return conversation.archived_by?.includes(currentUser?.email) || false;
  };

  // Filter conversations based on search, pin status, and archive status
  const filteredConversations = (conversations || [])
    .filter(conv => {
      const isArchived = isConversationArchived(conv);
      
      // If showing archived, only show archived conversations
      if (showArchived) {
        return isArchived;
      }
      
      // If not showing archived, exclude archived conversations
      if (isArchived) {
        return false;
      }
      
      // Search filter
      const name = getConversationName(conv).toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Pinned conversations always on top
      const aPinned = isConversationPinned(a);
      const bPinned = isConversationPinned(b);
      
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Otherwise sort by last message date
      const aDate = new Date(a.last_message_date || a.created_date);
      const bDate = new Date(b.last_message_date || b.created_date);
      return bDate.getTime() - aDate.getTime();
    });

  const archivedCount = (conversations || []).filter(conv => isConversationArchived(conv)).length;

  const filteredUsers = users.filter(u => 
    u.email !== currentUser?.email &&
    !selectedUsers.includes(u.email) &&
    getUserDisplayName(u).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isUserOnline = (user) => {
    if (!user || !user.last_seen) return false;
    const lastSeen = new Date(user.last_seen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Considera online se esteve ativo nos últimos 5 minutos
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {showArchived ? "Arquivadas" : "Conversas"}
            </h2>
            <div className="flex gap-2">
              {notificationPermission !== "granted" && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={requestNotificationPermission}
                  className="relative"
                  title="Ativar Notificações"
                >
                  <Bell className="w-4 h-4 text-orange-600" />
                </Button>
              )}
              
              {archivedCount > 0 && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowArchived(!showArchived)}
                  className="relative"
                  title={showArchived ? "Ver Conversas Ativas" : `Ver Arquivadas (${archivedCount})`}
                >
                  {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  {!showArchived && archivedCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gray-500">
                      {archivedCount > 9 ? '9+' : archivedCount}
                    </Badge>
                  )}
                </Button>
              )}
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowChatSettings(true)}
                title="Configurações de Notificação"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => {
                  setShowNewChatDialog(true);
                  setSearchQuery("");
                  setSelectedUsers([]);
                  setGroupName("");
                  setIsPublicGroup(false);
                  setSelectedDepartment("");
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                title="Nova Conversa"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={showArchived ? "Buscar arquivadas..." : "Buscar conversas..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">
                {showArchived ? "Nenhuma conversa arquivada" : "Nenhuma conversa encontrada"}
              </p>
            ) : (
              filteredConversations.map((conv) => {
                const unreadCount = getUnreadCount(conv.id);
                const avatar = getConversationAvatar(conv);
                const canDelete = canDeleteConversation(conv);
                const isPinned = isConversationPinned(conv);
                const isArchived = isConversationArchived(conv); 

                return (
                  <div key={conv.id} className="relative group">
                    <button
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                        selectedConversation?.id === conv.id
                          ? "bg-blue-50 border-2 border-blue-200"
                          : "hover:bg-gray-50"
                      } ${isPinned ? "bg-yellow-50/50" : ""}`}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          {avatar.src && <AvatarImage src={avatar.src} />}
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            {avatar.isGroup ? (
                              <Users className="w-5 h-5" />
                            ) : (
                              avatar.initials
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {!avatar.isGroup && avatar.user && isUserOnline(avatar.user) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                        {unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isPinned && <Pin className="w-3 h-3 text-yellow-600" title="Fixado" />}
                          <p className={`font-medium text-sm truncate ${unreadCount > 0 ? 'font-bold' : ''}`}>
                            {getConversationName(conv)}
                          </p>
                          {conv.is_public && conv.conversation_type === "group" && (
                            <Globe className="w-3 h-3 text-blue-600" title="Grupo Público" />
                          )}
                          {conv.conversation_type === "group" && !conv.is_public && (
                            <Lock className="w-3 h-3 text-gray-400" title="Grupo Privado" />
                          )}
                        </div>
                        {conv.last_message && (
                          <p className={`text-xs truncate ${unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                            {conv.last_message}
                          </p>
                        )}
                        {conv.last_message_date && (
                          <p className="text-xs text-gray-400">
                            {formatConversationTime(conv.last_message_date)}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white p-1 rounded-md border shadow-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handlePinConversation(conv, e)}
                        title={isPinned ? "Desafixar" : "Fixar"}
                      >
                        {isPinned ? (
                          <PinOff className="w-3 h-3 text-yellow-600" />
                        ) : (
                          <Pin className="w-3 h-3 text-gray-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleArchiveConversation(conv, e)}
                        title={isArchived ? "Desarquivar" : "Arquivar"}
                      >
                        {isArchived ? (
                          <ArchiveRestore className="w-3 h-3 text-blue-600" />
                        ) : (
                          <Archive className="w-3 h-3 text-gray-500" />
                        )}
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete(conv);
                            setShowDeleteDialog(true);
                          }}
                          title="Excluir Conversa"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const avatar = getConversationAvatar(selectedConversation);
                    return (
                      <>
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            {avatar.src && <AvatarImage src={avatar.src} />}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                              {avatar.isGroup ? (
                                <Users className="w-5 h-5" />
                              ) : (
                                avatar.initials
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {!avatar.isGroup && avatar.user && isUserOnline(avatar.user) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {getConversationName(selectedConversation)}
                            </h3>
                            {selectedConversation.is_public && selectedConversation.conversation_type === "group" && (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                Público
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {!avatar.isGroup && avatar.user ? (
                              isUserOnline(avatar.user) ? (
                                <span className="text-green-600 font-medium">● Online</span>
                              ) : (
                                <span>Visto {formatLastSeen(avatar.user.last_seen)}</span>
                              )
                            ) : typingUsers.size > 0 ? ( 
                              <span className="text-blue-600 font-medium italic">
                                {Array.from(typingUsers).slice(0, 2).join(", ")} digitando...
                              </span>
                            ) : (
                              `${selectedConversation.participants?.length} participante(s)`
                            )}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex gap-1">
                  {selectedConversation.conversation_type === 'group' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowGroupSettings(true)}
                      title="Configurações do Grupo"
                    >
                      <Settings className="w-4 h-4 text-gray-600" />
                    </Button>
                  )}
                  {canDeleteConversation(selectedConversation) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setConversationToDelete(selectedConversation);
                        setShowDeleteDialog(true);
                      }}
                      title="Excluir Conversa"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea 
              ref={scrollAreaRef}
              className="flex-1 p-4 bg-gray-50"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                   toast({ title: "Upload", description: "Arraste para o campo de input para enviar." });
                }
              }}
            >
              {/* Pinned Messages Banner */}
              {messages.some(m => m.is_pinned) && (
                <div className="mb-4 bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                  <button
                    onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                    className="flex items-center gap-2 text-amber-800 font-medium text-sm hover:text-amber-900 transition-colors"
                  >
                    <Pin className="w-4 h-4" />
                    <span>{messages.filter(m => m.is_pinned).length} mensagem(ns) fixada(s)</span>
                    <span className="ml-auto text-xs text-amber-600">
                      {showPinnedMessages ? "Ocultar" : "Ver"}
                    </span>
                  </button>
                  
                  {showPinnedMessages && (
                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                      {messages
                        .filter(m => m.is_pinned)
                        .map(msg => (
                          <div key={msg.id} className="bg-white rounded-lg p-2 border border-amber-200">
                            <p className="text-xs font-semibold text-amber-900 mb-1">
                              {users.find(u => u.email === msg.sender_email)?.display_name || msg.sender_name}
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">{msg.message}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1 pb-4">
                {messages
                  .filter(msg => !(msg.deleted_for || []).includes(currentUser.email))
                  .map((msg) => (
                  <MessageBubble 
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_email === currentUser?.email}
                    sender={users.find(u => u.email === msg.sender_email)}
                    readStatus={isMessageReadByOthers(msg)}
                    allParticipants={users.filter(u => selectedConversation?.participants?.includes(u.email))}
                    onReply={handleReply}
                    onDelete={handleDeleteMessage}
                    onReact={handleReact}
                    onPin={handlePinMessage}
                    onEdit={(m) => {
                      setEditingMessage(m);
                      setEditText(m.message);
                    }}
                  />
                ))}
                <div ref={messagesEndRef} style={{ height: 1 }} />
              </div>
            </ScrollArea>

            {/* Edit Message Bar */}
            {editingMessage && (
              <div className="bg-amber-50 border-t-2 border-amber-300 p-3">
                <div className="flex items-center gap-2 text-sm text-amber-800 mb-2">
                  <Edit2 className="w-4 h-4" />
                  <span className="font-medium">Editando mensagem</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingMessage(null);
                      setEditText("");
                    }}
                    className="ml-auto h-6"
                  >
                    Cancelar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleEditMessage();
                      }
                    }}
                    placeholder="Editar mensagem..."
                    className="flex-1"
                  />
                  <Button onClick={handleEditMessage} size="sm">
                    Salvar
                  </Button>
                </div>
              </div>
            )}

            <ChatInputArea 
              onSendMessage={handleSendMessage}
              onTyping={() => setTyping()}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              disabled={!canSendMessage}
              placeholder={!canSendMessage ? "Somente administradores podem enviar mensagens" : "Digite uma mensagem..."}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 space-y-4">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Selecione uma conversa para começar</p>
              {notificationPermission !== "granted" && (
                <Button
                  onClick={requestNotificationPermission}
                  variant="outline"
                  className="gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Ativar Notificações de Mensagens
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Conversa</label>
              <Select value={newChatType} onValueChange={setNewChatType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Chat Direto (1 pessoa)</SelectItem>
                  <SelectItem value="group">Grupo</SelectItem>
                  <SelectItem value="department">Departamento (Aberto para todos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newChatType === "group" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Grupo</label>
                  <Input
                    placeholder="Ex: Equipe de Registro"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                
                {isAdmin && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <Switch
                      id="public-group"
                      checked={isPublicGroup}
                      onCheckedChange={setIsPublicGroup}
                    />
                    <Label htmlFor="public-group" className="text-sm cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">Grupo Público</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Todos os usuários serão automaticamente adicionados e poderão ver este grupo
                      </p>
                    </Label>
                  </div>
                )}
              </>
            )}

            {newChatType === "department" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Chats de departamento são abertos para todos os usuários do sistema
                </p>
              </div>
            )}

            {newChatType !== "department" && !isPublicGroup && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Selecionar Usuários {newChatType === "direct" ? "(1)" : "(mínimo 1)"}
                  </label>
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-1">
                    {filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (newChatType === "direct") {
                            setSelectedUsers([user.email]);
                          } else {
                            if (selectedUsers.includes(user.email)) {
                              setSelectedUsers(selectedUsers.filter(e => e !== user.email));
                            } else {
                              setSelectedUsers([...selectedUsers, user.email]);
                            }
                          }
                        }}
                        className={`w-full p-2 rounded flex items-center gap-3 transition-colors ${
                          selectedUsers.includes(user.email)
                            ? "bg-blue-50 border-2 border-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.profile_picture} />
                            <AvatarFallback className="bg-blue-500 text-white text-xs">
                              {getInitials(getUserDisplayName(user))}
                            </AvatarFallback>
                          </Avatar>
                          {isUserOnline(user) && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium">{getUserDisplayName(user)}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(email => {
                      const user = users.find(u => u.email === email);
                      return (
                        <Badge key={email} className="gap-1">
                          {getUserDisplayName(user)}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => setSelectedUsers(selectedUsers.filter(e => e !== email))}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
              Cancelar</Button>
            <Button onClick={handleCreateConversation}>
              Criar Conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedConversation && (
        <GroupSettingsModal
          open={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversation={selectedConversation}
          currentUser={currentUser}
          users={users}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }}
        />
      )}

      {currentUser && (
        <ChatSettingsModal 
          open={showChatSettings}
          onClose={() => setShowChatSettings(false)}
          currentUser={currentUser}
          onUpdate={() => {
            // Refresh user data to apply new settings
            loadInitialData();
          }}
        />
      )}
    </div>
  );
}