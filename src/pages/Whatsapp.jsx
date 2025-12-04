import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Send, 
  Phone, 
  Video,
  MessageCircle,
  Check,
  CheckCheck,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AGENT_NAME = "system_assistant";

export default function Whatsapp() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Load conversations list
  useEffect(() => {
    loadConversations();
    
    // Poll for new conversations/updates every 10s (simple version)
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to active conversation
  useEffect(() => {
    if (selectedConversationId) {
      // Load initial messages
      loadMessages(selectedConversationId);

      // Subscribe to updates
      if (subscriptionRef.current) subscriptionRef.current();
      
      try {
        subscriptionRef.current = base44.agents.subscribeToConversation(selectedConversationId, (data) => {
          if (data && data.messages) {
            setMessages(data.messages);
          }
        });
      } catch (e) {
        console.error("Failed to subscribe:", e);
      }
    }

    return () => {
      if (subscriptionRef.current) subscriptionRef.current();
    };
  }, [selectedConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const list = await base44.agents.listConversations({
        agent_name: AGENT_NAME,
      });
      // Sort by updated date if available, or created date
      const sorted = (list || []).sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });
      setConversations(sorted);
      setLoading(false);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setLoading(false);
    }
  };

  const loadMessages = async (id) => {
    try {
      const conv = await base44.agents.getConversation(id);
      if (conv && conv.messages) {
        setMessages(conv.messages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId || sending) return;

    const content = newMessage;
    setNewMessage("");
    setSending(true);

    try {
      const conversation = conversations.find(c => c.id === selectedConversationId);
      if (conversation) {
        // We send as "assistant" to reply TO the user on WhatsApp
        // The AI agent normally acts as assistant, so manual override acts as assistant too.
        await base44.agents.addMessage(conversation, {
          role: "assistant",
          content: content
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message on error
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const getConversationName = (conv) => {
    // Try to get name from metadata, or fallback to 'User'
    // WhatsApp integration often puts phone number or name in metadata if available
    // The structure depends on the adapter, but let's look for common patterns
    return conv.metadata?.user_name || conv.metadata?.phone_number || `Contato ${conv.id.slice(0, 4)}`;
  };

  const getLastMessage = (conv) => {
     // This data might not be in the list view depending on the API response structure.
     // If not available, we might need to fetch or it's just empty in the list.
     // Assuming Base44 list returns basic info.
     return "Clique para ver as mensagens";
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left Sidebar - Conversations List */}
      <div className="w-full md:w-[400px] bg-white border-r flex flex-col h-full">
        {/* Header */}
        <div className="h-16 bg-gray-50 border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-green-600 text-white">S</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-gray-700">Sistema</span>
          </div>
          <div className="flex gap-2 text-gray-500">
            <Button variant="ghost" size="icon">
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Pesquisar ou começar uma nova conversa" 
              className="pl-10 bg-gray-50 border-none focus-visible:ring-1"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 bg-white">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando conversas...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhuma conversa encontrada.</div>
          ) : (
            <div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-50 ${
                    selectedConversationId === conv.id ? "bg-gray-100" : ""
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gray-200 text-gray-600">
                      {getConversationName(conv).slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-gray-900 font-medium truncate">
                        {getConversationName(conv)}
                      </h3>
                      {conv.updated_at && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatTime(conv.updated_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {getLastMessage(conv)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative">
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-gray-50 border-b flex items-center justify-between px-4 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-300">
                    {getConversationName(conversations.find(c => c.id === selectedConversationId) || {}).slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-gray-900 font-medium">
                    {getConversationName(conversations.find(c => c.id === selectedConversationId) || {})}
                  </h3>
                  <span className="text-xs text-gray-500">clique para dados do contato</span>
                </div>
              </div>
              <div className="flex gap-2 text-gray-500">
                <Button variant="ghost" size="icon">
                  <Search className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none" 
                 style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 sm:p-8 z-0">
              <div className="flex flex-col gap-2 pb-4">
                {messages.map((msg, index) => {
                  // role 'user' = WhatsApp User (Incoming)
                  // role 'assistant' = System/Agent (Outgoing)
                  const isOutgoing = msg.role === 'assistant';
                  
                  // Ignore system messages if any (usually hidden in WA view)
                  if (msg.role === 'system') return null;

                  return (
                    <div
                      key={index}
                      className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-1`}
                    >
                      <div
                        className={`max-w-[70%] sm:max-w-[60%] rounded-lg px-3 py-1.5 shadow-sm text-sm relative group ${
                          isOutgoing 
                            ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" 
                            : "bg-white text-gray-900 rounded-tl-none"
                        }`}
                      >
                        {/* Sender Name (only for incoming in groups, but here assumes direct) */}
                        
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        
                        <div className={`flex items-center justify-end gap-1 mt-1 select-none ${isOutgoing ? "text-green-600" : "text-gray-400"}`}>
                          <span className="text-[10px] opacity-70">
                            {/* We don't have precise timestamp per msg in basic list, assuming 'now' for new or just ignoring time if missing */}
                            {format(new Date(), "HH:mm")}
                          </span>
                          {isOutgoing && (
                            <CheckCheck className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 shrink-0 z-10">
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Smile className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Paperclip className="w-6 h-6" />
              </Button>
              
              <form 
                className="flex-1 flex items-center gap-2"
                onSubmit={handleSendMessage}
              >
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem"
                  className="flex-1 bg-white border-none focus-visible:ring-0 rounded-lg h-10"
                />
                {newMessage.trim() ? (
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full h-10 w-10 flex-shrink-0"
                    disabled={sending}
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="text-gray-500" type="button">
                    <Mic className="w-6 h-6" />
                  </Button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 h-full border-b-[6px] border-green-500">
            <div className="max-w-[500px]">
               <h1 className="text-3xl font-light text-gray-700 mb-4">WhatsApp Web (Sistema)</h1>
               <p className="text-gray-500 mb-6">
                 Envie e receba mensagens do WhatsApp diretamente por aqui.<br/>
                 Selecione uma conversa à esquerda para começar.
               </p>
               <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                 <MessageCircle className="w-3 h-3" />
                 <span>Protegido por criptografia de ponta a ponta (via Base44)</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}