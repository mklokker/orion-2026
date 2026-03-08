import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MoreVertical, 
  Users, 
  Search,
  FolderOpen,
  ListPlus,
  ChevronDown,
  CheckSquare,
  Star,
} from "lucide-react";
import { useFavorites } from "./useFavorites";
import FavoritesModal from "./FavoritesModal";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import PresenceIndicator, { statusConfig } from "./PresenceIndicator";
import TypingIndicator from "./TypingIndicator";
import PinnedMessages from "./PinnedMessages";
import ConversationFilesModal from "./ConversationFilesModal";
import TaskRequestModal from "./TaskRequestModal";
import MessageSearchModal from "./MessageSearchModal";
import ChatBackground from "./ChatBackground";
import StatusTagFilter from "./StatusTagFilter";
import SelectionBar from "./SelectionBar";
import ForwardMessageModal from "./ForwardMessageModal";
import BatchApprovalFromSelectionModal from "./BatchApprovalFromSelectionModal";
import { groupMessagesByDateBR, getDateLabelBR } from "@/components/utils/dateUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { base44 } from "@/api/base44Client";

const ChatMessage = base44.entities.ChatMessage;
const CHUNK_SIZE = 20;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function ConversationView({
  conversation,
  messages,
  currentUser,
  users,
  onSend,
  onTyping,
  onBack,
  onOpenSettings,
  onEditMessage,
  onDeleteMessage,
  onReaction,
  onImageClick,
  onPinMessage,
  onStatusTag,
  onForward,
  typingUsers,
  presenceMap = {},
  isAdmin = false,
  onApproveTaskRequest,
  chatBgPrefs,
  onLoadMore,
  hasMoreMessages = false,
  isLoadingMore = false,
  autoFocusTrigger,
  conversations = [],
  taskRequestStatuses = {},
  departments = [],
  }) {
  const scrollRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showTaskRequestModal, setShowTaskRequestModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Favorites ────────────────────────────────────────────────────────────────
  const { isFavorited, toggleFavorite, records: favRecords, loading: favLoading, refresh: refreshFavs } = useFavorites(currentUser?.email);

  const getConvName = () => {
    if (!conversation) return "";
    if (conversation.type === "group") return conversation.name || "Grupo";
    if (conversation.type === "self") return "Minhas Anotações";
    const otherEmail = conversation.participants?.find(p => p !== currentUser?.email);
    const otherUser = users.find(u => u.email === otherEmail);
    return otherUser?.display_name || otherUser?.full_name || otherEmail || "Conversa";
  };

  const handleFavorite = async (message) => {
    const convName = getConvName();
    await toggleFavorite(message, convName);
  };

  // ── Selection mode ─────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBatchForward, setShowBatchForward] = useState(false);
  const [showBatchApprovalModal, setShowBatchApprovalModal] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const enterSelectionMode = () => { setSelectionMode(true); setSelectedIds(new Set()); };
  const exitSelectionMode  = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Which selected messages can the current user delete?
  const selectableForDelete = React.useMemo(() => {
    if (!selectionMode) return new Set();
    const ids = new Set();
    (messages || []).forEach(m => {
      if (selectedIds.has(m.id) && (m.sender_email === currentUser?.email || isAdmin)) {
        ids.add(m.id);
      }
    });
    return ids;
  }, [selectedIds, messages, currentUser, isAdmin, selectionMode]);

  const canDeleteSelected = selectableForDelete.size > 0 && selectableForDelete.size === selectedIds.size;

  // Batch delete
  const handleBatchDelete = async () => {
    if (!selectedIds.size) return;
    setBatchProcessing(true);
    const ids = [...selectedIds];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(id =>
        ChatMessage.update(id, { is_deleted: true, content: "" }).catch(() => {})
      ));
      if (i + CHUNK_SIZE < ids.length) await sleep(150);
    }
    setBatchProcessing(false);
    setShowDeleteConfirm(false);
    exitSelectionMode();
  };

  // Sorted selected messages for forward (preserve order)
  const selectedMessagesOrdered = React.useMemo(() => {
    if (!selectionMode) return [];
    return (messages || [])
      .filter(m => selectedIds.has(m.id))
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [selectedIds, messages, selectionMode]);

  // Extract TaskRequest IDs from selected messages (for batch approval)
  const selectedTaskRequestIds = React.useMemo(() => {
    if (!selectionMode) return [];
    const ids = new Set();
    (messages || []).forEach(m => {
      if (!selectedIds.has(m.id)) return;
      const id = m.task_request_id || m.content?.match(/`ID:\s*([a-zA-Z0-9_-]+)`/)?.[1];
      if (id) ids.add(id);
    });
    return [...ids];
  }, [selectedIds, messages, selectionMode]);
  const messageRefs = useRef({});
  const bottomRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  // ─── Scroll Manager ─────────────────────────────────────────────────────────
  // Tracks per-conversation initial scroll state
  const initialScrollDoneRef = useRef({}); // { [conversationId]: boolean }
  const isUserInteractingRef = useRef(false);
  const userInteractingTimerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const lastActionRef = useRef("initial_load"); // "initial_load" | "send" | "realtime_new" | "update"
  const prevMessagesLengthRef = useRef(0);
  const prevConversationIdRef = useRef(null);

  const BOTTOM_THRESHOLD = 60; // px from bottom = "at bottom"

  const checkIsAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  }, []);

  // Instant scroll (no animation) — used only for initial load
  const scrollToBottomInstant = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
    setShowScrollButton(false);
    setNewMessagesCount(0);
  }, []);

  // Smooth scroll — used for send / new message button
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewMessagesCount(0);
    setShowScrollButton(false);
  }, []);

  // Mensagens fixadas
  const pinnedMessages = messages.filter(m => m.is_pinned).sort((a, b) => 
    new Date(b.pinned_at || b.created_date) - new Date(a.pinned_at || a.created_date)
  );
  
  // Scroll para uma mensagem específica
  const scrollToMessage = useCallback((messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-amber-100/50");
      setTimeout(() => element.classList.remove("bg-amber-100/50"), 2000);
    }
  }, []);

  // Detectar interação do usuário com scroll
  const handleScroll = useCallback((e) => {
    const target = e.target;
    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < BOTTOM_THRESHOLD;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
    if (atBottom) setNewMessagesCount(0);

    // Mark user as interacting (suppress auto-scroll for 2s)
    isUserInteractingRef.current = true;
    clearTimeout(userInteractingTimerRef.current);
    userInteractingTimerRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 2000);
  }, []);

  // ── Core scroll effect: conversation change vs messages update ──────────────
  useEffect(() => {
    if (!messages.length) return;

    const convId = conversation?.id;
    const isNewConversation = convId !== prevConversationIdRef.current;

    if (isNewConversation) {
      // Reset state for new conversation
      prevConversationIdRef.current = convId;
      isUserInteractingRef.current = false;
      isAtBottomRef.current = true;
      setNewMessagesCount(0);
      setShowScrollButton(false);
      lastActionRef.current = "initial_load";
      prevMessagesLengthRef.current = messages.length;

      // Scroll to bottom once, after DOM renders (two rAF for safety)
      if (!initialScrollDoneRef.current[convId]) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottomInstant();
            initialScrollDoneRef.current[convId] = true;
          });
        });
      }
      return;
    }

    // Same conversation — check what changed
    const currentLength = messages.length;
    const prevLength = prevMessagesLengthRef.current;
    const messagesAdded = currentLength > prevLength;
    prevMessagesLengthRef.current = currentLength;

    if (!messagesAdded) {
      // Messages were updated (reaction/pin/status/edit) — never scroll
      lastActionRef.current = "update";
      return;
    }

    // New messages arrived
    const action = lastActionRef.current;

    if (action === "send") {
      // I just sent — always scroll to bottom
      requestAnimationFrame(() => scrollToBottomInstant());
      lastActionRef.current = "update";
      return;
    }

    // Realtime message from someone else
    if (isAtBottomRef.current && !isUserInteractingRef.current) {
      // Stick-to-bottom: user is at bottom, auto-scroll
      requestAnimationFrame(() => scrollToBottomInstant());
    } else {
      // User is scrolling above — show "new messages" indicator
      setNewMessagesCount(n => n + (currentLength - prevLength));
    }
  }, [messages, conversation?.id, scrollToBottomInstant]);

  // Atalho Ctrl+F para abrir busca
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isGroup = conversation?.type === "group";
  
  const getDisplayInfo = () => {
    if (!conversation) return { name: "Conversa", avatar: null, subtitle: "", otherEmail: null, status: null };
    if (isGroup) {
      return {
        name: conversation.name || "Grupo",
        avatar: conversation.avatar_url,
        subtitle: `${conversation.participants?.length || 0} participantes`,
        otherEmail: null,
        status: null
      };
    }
    const otherEmail = conversation.participants?.find(p => p !== currentUser?.email);
    const otherUser = users.find(u => u.email === otherEmail);
    const status = presenceMap[otherEmail] || "offline";
    const statusLabel = statusConfig[status]?.label || "Offline";
    return {
      name: otherUser?.display_name || otherUser?.full_name || otherEmail || "Usuário",
      avatar: otherUser?.profile_picture,
      subtitle: statusLabel,
      otherEmail,
      status
    };
  };

  const display = getDisplayInfo();

  // Get user avatar
  const getUserAvatar = (email) => {
    const user = users.find(u => u.email === email);
    return user?.profile_picture;
  };

  // Filter messages by status tag
  const filteredMessages = React.useMemo(() => {
    if (statusFilter === "all") return messages || [];
    if (statusFilter === "tagged") return (messages || []).filter(m => m.status_tag && m.status_tag !== "none");
    return (messages || []).filter(m => m.status_tag === statusFilter);
  }, [messages, statusFilter]);

  // Group messages by date em timezone Brasil
  const groupedMessages = groupMessagesByDateBR(filteredMessages);

  const handleSend = async (msgData) => {
    // Mark as "send" so scroll manager knows to auto-scroll after this message
    lastActionRef.current = "send";
    await onSend({
      ...msgData,
      reply_to_id: replyingTo?.id,
      reply_to_content: replyingTo?.content,
      reply_to_sender: replyingTo?.sender_name
    });
    setReplyingTo(null);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-muted/30 w-full min-w-0 h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-3 bg-card border-b border-border z-30 shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-10 w-10" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="w-9 h-9 md:w-10 md:h-10 cursor-pointer" onClick={onOpenSettings}>
            <AvatarImage src={display.avatar} />
            <AvatarFallback className={isGroup ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
              {isGroup ? <Users className="w-4 h-4 md:w-5 md:h-5" /> : getInitials(display.name)}
            </AvatarFallback>
          </Avatar>
          {!isGroup && display.status && (
            <PresenceIndicator 
              status={display.status}
              size="md"
              className="absolute bottom-0 right-0"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenSettings}>
          <h3 className="font-semibold text-foreground truncate text-sm md:text-base">{display.name}</h3>
          <p className={`text-xs truncate ${
            display.status === "online" ? "text-green-600" : 
            display.status === "away" ? "text-yellow-600" : 
            display.status === "dnd" ? "text-red-600" : "text-muted-foreground"
          }`}>
            {display.subtitle}
          </p>
        </div>

        {/* Desktop: show all buttons */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => { refreshFavs(); setShowFavoritesModal(true); }} title="Mensagens favoritas">
            <Star className="w-5 h-5 text-amber-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowFilesModal(true)} title="Ver arquivos">
            <FolderOpen className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowTaskRequestModal(true)} title="Solicitar Tarefas">
            <ListPlus className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile + Desktop: dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenSettings}>
              Detalhes da conversa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowFilesModal(true)}>
              <FolderOpen className="w-4 h-4 mr-2" /> Ver arquivos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTaskRequestModal(true)}>
              <ListPlus className="w-4 h-4 mr-2" /> Solicitar Tarefas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSearchModal(true)}>
              <Search className="w-4 h-4 mr-2" /> Buscar mensagens
            </DropdownMenuItem>
            <DropdownMenuItem onClick={enterSelectionMode}>
              <CheckSquare className="w-4 h-4 mr-2" /> Selecionar mensagens
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { refreshFavs(); setShowFavoritesModal(true); }}>
              <Star className="w-4 h-4 mr-2 text-amber-400" /> Mensagens favoritas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection Bar (replaces normal header actions when in selection mode) */}
      {selectionMode && (
        <SelectionBar
          count={selectedIds.size}
          onCancel={exitSelectionMode}
          onDelete={() => setShowDeleteConfirm(true)}
          onForward={() => setShowBatchForward(true)}
          canDeleteAll={canDeleteSelected || isAdmin}
          isAdmin={isAdmin}
          taskRequestCount={selectedTaskRequestIds.length}
          onBatchApprove={() => setShowBatchApprovalModal(true)}
        />
      )}

      {/* Pinned Messages */}
      <div className="shrink-0">
        <PinnedMessages
          pinnedMessages={pinnedMessages}
          users={users}
          currentUser={currentUser}
          onUnpin={onPinMessage}
          onScrollToMessage={scrollToMessage}
        />
      </div>

      {/* Status Tag Filter */}
      {conversation && (
        <div className="flex items-center px-2 md:px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <StatusTagFilter value={statusFilter} onChange={setStatusFilter} messages={messages} />
        </div>
      )}

      {/* Messages - área com scroll próprio */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-x-hidden w-full relative"
        style={{ isolation: "isolate" }}
      >
        {/* Chat background layer - absolute, não interfere no scroll */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <ChatBackground chatBgPrefs={chatBgPrefs} />
        </div>

        {/* Messages layer */}
        <div className="relative z-10 px-2 md:px-4 py-2 md:py-4">
        {/* Load older messages */}
        {hasMoreMessages && (
          <div className="flex justify-center py-3">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="text-xs px-4 py-2 rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? "Carregando..." : "Carregar mensagens anteriores"}
            </button>
          </div>
        )}
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs bg-card/90 text-muted-foreground px-3 py-1 rounded-full shadow-sm border border-border/50">
                {getDateLabelBR(date)}
              </span>
            </div>

            {/* Messages */}
            {msgs.map((msg, idx) => {
              const isOwn = msg.sender_email === currentUser?.email;
              const prevMsg = msgs[idx - 1];
              const showAvatar = isGroup
                ? (!prevMsg || prevMsg.sender_email !== msg.sender_email)
                : (!prevMsg || prevMsg.sender_email !== msg.sender_email);

              return (
                <div
                  key={msg.id}
                  ref={el => messageRefs.current[msg.id] = el}
                  className="transition-colors duration-500 rounded-lg"
                >
                  <MessageBubble
                    message={{...msg, _currentUser: currentUser}}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    senderAvatar={getUserAvatar(msg.sender_email)}
                    isGroupChat={isGroup}
                    onReply={selectionMode ? undefined : setReplyingTo}
                    onEdit={selectionMode ? undefined : onEditMessage}
                    onDelete={selectionMode ? undefined : onDeleteMessage}
                    onReaction={selectionMode ? undefined : onReaction}
                    onImageClick={selectionMode ? undefined : onImageClick}
                    onPin={selectionMode ? undefined : onPinMessage}
                    onStatusTag={selectionMode ? undefined : onStatusTag}
                    onForward={selectionMode ? undefined : onForward}
                    onFavorite={selectionMode ? undefined : handleFavorite}
                    isFavorited={isFavorited(msg.id)}
                    onScrollToMessage={selectionMode ? undefined : scrollToMessage}
                    isAdmin={isAdmin}
                    onApproveTaskRequest={selectionMode ? undefined : onApproveTaskRequest}
                    users={users}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(msg.id)}
                    onToggleSelect={toggleSelect}
                    taskRequestStatusOverride={(() => {
                      const id = msg.task_request_id || msg.content?.match(/`ID:\s*([a-zA-Z0-9_-]+)`/)?.[1];
                      return id ? (taskRequestStatuses[id] ?? null) : null;
                    })()}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers?.length > 0 && (
          <TypingIndicator typingUsers={typingUsers} users={users} />
        )}

        {/* Âncora para scroll automático */}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Botão scroll para baixo / novas mensagens */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all text-xs font-medium"
        >
          {newMessagesCount > 0 ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              {newMessagesCount} nova{newMessagesCount > 1 ? "s" : ""}
            </>
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Input - fixo no rodapé (oculto em modo seleção) */}
      {!selectionMode && (
        <ChatInput
          onSend={handleSend}
          onTyping={onTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          participants={conversation?.participants || []}
          allUsers={users}
          autoFocusTrigger={autoFocusTrigger}
        />
      )}

      {/* Files Modal */}
      <ConversationFilesModal
        open={showFilesModal}
        onClose={() => setShowFilesModal(false)}
        conversation={conversation}
        users={users}
      />

      {/* Task Request Modal */}
      <TaskRequestModal
        open={showTaskRequestModal}
        onClose={() => setShowTaskRequestModal(false)}
        currentUser={currentUser}
        conversationId={conversation?.id}
        onSendMessage={handleSend}
      />

      {/* Message Search Modal */}
      <MessageSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        conversation={conversation}
        onNavigateToMessage={scrollToMessage}
      />

      {/* Favorites Modal */}
      <FavoritesModal
        open={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        records={favRecords}
        loading={favLoading}
        currentConversationId={conversation?.id}
        onUnfavorite={(fav) => {
          // Build a minimal message object to toggle
          toggleFavorite({ id: fav.message_id, conversation_id: fav.conversation_id });
        }}
        onGoTo={(fav) => {
          setShowFavoritesModal(false);
          // If message is in current conversation, scroll to it
          if (fav.conversation_id === conversation?.id) {
            // Try to find it in current messages
            const found = (messages || []).find(m => m.id === fav.message_id);
            if (found) {
              setTimeout(() => scrollToMessage(fav.message_id), 100);
            } else {
              // Message not loaded yet — inform user
              scrollToMessage(fav.message_id);
            }
          }
          // Cross-conversation navigation is handled by pages/Chat via onGoToFavorite
        }}
      />

      {/* Batch Delete Confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} mensagem{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As mensagens serão marcadas como excluídas para todos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchProcessing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Approval from Selection Modal */}
      {showBatchApprovalModal && (
        <BatchApprovalFromSelectionModal
          open={showBatchApprovalModal}
          onClose={() => setShowBatchApprovalModal(false)}
          taskRequestIds={selectedTaskRequestIds}
          currentUser={currentUser}
          departments={departments}
          onApproved={() => {
            setShowBatchApprovalModal(false);
            exitSelectionMode();
          }}
        />
      )}

      {/* Batch Forward Modal — usa o onForward do pages/Chat mas iterando todas as msgs */}
      {showBatchForward && (
        <ForwardMessageModal
          open={showBatchForward}
          onClose={() => { setShowBatchForward(false); }}
          message={selectedMessagesOrdered}
          conversations={conversations}
          users={users}
          currentUser={currentUser}
          onForward={async (msgs, target) => {
            if (!onForward) return;
            setBatchProcessing(true);
            const list = Array.isArray(msgs) ? msgs : [msgs];
            for (const m of list) {
              await onForward(m, target);
            }
            setBatchProcessing(false);
            setShowBatchForward(false);
            exitSelectionMode();
          }}
          isBatch={true}
        />
      )}
    </div>
  );
}