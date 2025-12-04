import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  BarChart3,
  Settings,
  CheckSquare,
  LogOut,
  TrendingUp,
  Star,
  Bell,
  MessageSquare,
  Files,
  GraduationCap,
  Eraser,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { AppSettings } from "@/entities/AppSettings";
import { ChatMessage } from "@/entities/ChatMessage";
import { ChatConversation } from "@/entities/ChatConversation";
import { useUnreadChatCounts } from "@/components/chat/useChat";
import UserProfileModal from "./components/profile/UserProfileModal";
import NotificationCenter from "./components/notifications/NotificationCenter";
import TaskViewEditModal from "./components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "./components/services/ServiceViewEditModal";
import { Toaster } from "./components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getUserDisplayName = (user) => {
  return user?.display_name || user?.full_name || "Usuário";
};

const SETTINGS_CACHE_KEY = "orion_app_settings";
const SETTINGS_CACHE_DURATION = 1000 * 60 * 60; // 1 hora

const getCachedSettings = () => {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < SETTINGS_CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error("Erro ao ler cache de settings:", error);
  }
  return null;
};

const setCachedSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
      data: settings,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error("Erro ao salvar cache de settings:", error);
  }
};

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [appSettings, setAppSettings] = React.useState(null);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  
  const { data: chatData } = useUnreadChatCounts(user?.email);
  const unreadChatCount = chatData?.totalUnread || 0;
  const latestMessageDate = chatData?.latestMessageDate;
  const latestMessageBy = chatData?.latestMessageBy;
  const latestMessageType = chatData?.latestMessageType;

  // Sound Notification Logic
  const lastSoundPlayedRef = React.useRef(null);
  const lastSenderRef = React.useRef(null);
  const lastSoundTimeRef = React.useRef(0);

  React.useEffect(() => {
    if (latestMessageDate && latestMessageBy && user) {
      const isNewMessage = !lastSoundPlayedRef.current || new Date(latestMessageDate) > new Date(lastSoundPlayedRef.current);
      const isNotFromMe = latestMessageBy !== user.email;

      if (isNewMessage && isNotFromMe) {
        // Check User Preferences
        const prefs = user.chat_preferences || {};
        
        // 1. Check Do Not Disturb
        if (prefs.dnd_until && new Date(prefs.dnd_until) > new Date()) {
          return;
        }

        // 2. Check Conversation Type Permissions
        // Assuming defaults to true if not set
        const notifyDirect = prefs.notify_direct !== false;
        const notifyGroup = prefs.notify_group !== false;

        if (latestMessageType === 'direct' && !notifyDirect) return;
        if ((latestMessageType === 'group' || latestMessageType === 'department') && !notifyGroup) return;

        // 3. Grouping/Debounce Logic
        const now = Date.now();
        const timeDiff = now - lastSoundTimeRef.current;
        const sameSender = lastSenderRef.current === latestMessageBy;

        // If same sender within 10 seconds, skip sound (grouped notification)
        if (sameSender && timeDiff < 10000) {
          lastSoundPlayedRef.current = latestMessageDate;
          return;
        }

        // Trigger Sound & Desktop Notification
        playNotificationSound();
        showDesktopNotification(latestMessageBy);
        
        // Update refs
        lastSoundPlayedRef.current = latestMessageDate;
        lastSenderRef.current = latestMessageBy;
        lastSoundTimeRef.current = now;
      }
    }
  }, [latestMessageDate, latestMessageBy, user, latestMessageType]);

  const showDesktopNotification = (senderEmail) => {
    if (typeof Notification === 'undefined') return;
    
    if (Notification.permission === "granted") {
      // Don't show if window is focused (optional preference, but user asked for background notifications)
      // Actually user said "mesmo que não estivesse com a aba do sistema", implying background.
      // Standard behavior is to show if hidden.
      
      if (document.visibilityState === 'hidden') {
        const senderName = senderEmail.split('@')[0]; // Simple name extraction if user object not available fully
        const notification = new Notification("Nova mensagem", {
          body: `Você recebeu uma nova mensagem de ${senderName}`,
          icon: '/favicon.ico',
          tag: 'chat-message' // Replace existing to avoid stacking too many
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    }
  };

  const playNotificationSound = () => {
    // Priority: User Preference > App Settings > Default
    const userSound = user?.chat_preferences?.notification_sound;
    const appSound = appSettings?.notification_sound;
    
    // If explicit 'none' in app settings, we might respect it, 
    // BUT user pref should probably override. 
    // If user hasn't set anything (undefined), fallback to app.
    
    // Let's assume user preference 'default' means "use app setting or standard beep"
    // If user specifically sets a sound, use it.
    
    const soundType = (userSound && userSound !== 'default') ? userSound : (appSound || 'default');
    
    if (soundType === 'none') return;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
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
        default:
          oscillator.frequency.value = 440;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };


  
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [showServiceModal, setShowServiceModal] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);

  const isAdmin = user?.role === 'admin';

  const navigationItems = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Gestão de Tarefas", url: createPageUrl("GestaoTarefas"), icon: ClipboardList },
    { title: "Carga Diária", url: createPageUrl("CargaDiaria"), icon: FileText },
    { title: "Chat", url: createPageUrl("Chat"), icon: MessageSquare, badge: unreadChatCount },
    { title: "Acervo", url: createPageUrl("Acervo"), icon: Files },
    { title: "Cursos", url: createPageUrl("Cursos"), icon: GraduationCap },
    { title: "Removedor", url: createPageUrl("Removedor"), icon: Eraser },
    { title: "Produtividade Geral", url: createPageUrl("ProdutividadeGeral"), icon: TrendingUp },
    { title: "Ranking", url: createPageUrl("Ranking"), icon: Star },
    { title: "Relatórios", url: createPageUrl("Relatorios"), icon: BarChart3 },
    ...(isAdmin ? [{ title: "Administração", url: createPageUrl("Admin"), icon: Settings }] : [])
  ];

  React.useEffect(() => {
    loadInitialData();
  }, []);

  // REMOVIDO: useEffect que carrega chat count quando navega para página de chat
  // Isso evita chamadas desnecessárias que causam rate limit
  // React.useEffect(() => {
  //   if (location.pathname.includes('Chat')) {
  //     loadUnreadChatCount();
  //   }
  // }, [location.pathname]);

  const loadInitialData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      const cachedSettings = getCachedSettings();
      if (cachedSettings) {
        setAppSettings(cachedSettings);
      }
      
      try {
        const settingsData = await AppSettings.list();
        if (settingsData.length > 0) {
          setAppSettings(settingsData[0]);
          setCachedSettings(settingsData[0]);
        }
      } catch (settingsError) {
        if (settingsError?.response?.status !== 429) {
          console.error("Erro ao carregar configurações de aparência:", settingsError);
        }
      }
      
      await loadUnreadCount();
      // COMPLETAMENTE REMOVIDO: loadUnreadChatCount()
      // Não carregar contagem de chat para evitar rate limit
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      if (!user?.email) return;
      
      const notifications = await Notification.filter({
        user_email: user.email,
        read: false
      });
      setUnreadCount(notifications.length);
    } catch (error) {
      if (error?.response?.status !== 429) {
        console.error("Erro ao carregar notificações:", error);
      }
    }
  };

  // COMPLETAMENTE REMOVIDO: loadUnreadChatCount()
  // Função não é mais necessária pois não mostramos contador de chat
  // const loadUnreadChatCount = async () => {
  //   try {
  //     if (!user?.email) return;
      
  //     const allConversations = await ChatConversation.list();
  //     const userConversations = allConversations.filter(conv => 
  //       conv.participants?.includes(user.email) ||
  //       (conv.conversation_type === "group" && conv.is_public) ||
  //       conv.conversation_type === "department"
  //     );

  //     // DESABILITAR contagem se houver muitas conversas (evitar rate limit)
  //     if (userConversations.length > 10) {
  //       console.warn("[Layout] Muitas conversas, desabilitando contador de chat.");
  //       setUnreadChatCount(0);
  //       return;
  //     }

  //     let totalUnread = 0;
      
  //     // MÁXIMA OTIMIZAÇÃO: Limitar a apenas 2 conversas
  //     const limitedConversations = userConversations.slice(0, 2);
      
  //     for (const conv of limitedConversations) {
  //       try {
  //         const messages = await ChatMessage.filter({ conversation_id: conv.id });
  //         const unreadMessages = messages.filter(
  //           msg => msg.sender_email !== user.email && 
  //                  !msg.read_by?.includes(user.email)
  //         );
  //         totalUnread += unreadMessages.length;
  //       } catch (err) {
  //         // Parar completamente se atingir rate limit
  //         if (err?.response?.status === 429) {
  //           console.warn("[Layout] Rate limit - parando contagem de chat.");
  //           break;
  //         }
  //       }
  //     }

  //     setUnreadChatCount(totalUnread > 0 ? totalUnread : 0);
  //   } catch (error) {
  //     if (error?.response?.status !== 429) {
  //       console.error("Erro ao carregar contagem de chat:", error);
  //     }
  //   }
  // };

  const handleNotificationClick = async (notification) => {
    try {
      setShowNotifications(false);
      
      if (notification.related_item_type === 'task') {
        const task = await Task.filter({ id: notification.related_item_id });
        if (task.length > 0) {
          const [usersData] = await Promise.all([
            User.list().catch(() => [user])
          ]);
          setUsers(usersData);
          setSelectedItem(task[0]);
          setShowTaskModal(true);
        }
      } else if (notification.related_item_type === 'service') {
        const service = await Service.filter({ id: notification.related_item_id });
        if (service.length > 0) {
          const [usersData] = await Promise.all([
            User.list().catch(() => [user])
          ]);
          setUsers(usersData);
          setSelectedItem(service[0]);
          setShowServiceModal(true);
        }
      }
    } catch (error) {
      console.error("Erro ao abrir item da notificação:", error);
    }
  };

  const handleLogout = async () => {
    await User.logout();
  };

  // NOVO: Handler para abrir notificações - carrega sob demanda
  const handleOpenNotifications = () => {
    setShowNotifications(true);
    // O NotificationCenter vai carregar as notificações quando abrir
  };

  return (
    <QueryClientProvider client={queryClient}>
    <SidebarProvider>
      {appSettings && (
        <style>{`
          :root {
            --primary: ${appSettings.primary_color};
            --primary-accent: ${appSettings.primary_accent_color};
            --success: ${appSettings.success_color};
            --danger: ${appSettings.danger_color};
          }
          .bg-primary { background-color: var(--primary); }
          .bg-primary-accent { background-color: var(--primary-accent); }
          .bg-success { background-color: var(--success); }
          .bg-danger { background-color: var(--danger); }
          .text-primary { color: var(--primary); }
          .border-primary { border-color: var(--primary); }
          .from-primary { --tw-gradient-from: var(--primary); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(255, 255, 255, 0)); }
          .to-primary-accent { --tw-gradient-to: var(--primary-accent); }
        `}</style>
      )}
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <Link to={createPageUrl("Dashboard")} className="block">
              <div className="flex justify-center items-center h-24">
                {appSettings?.logo_url ? (
                  <img src={appSettings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg">
                    <CheckSquare className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                Menu Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-blue-50 hover:text-primary transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-primary to-primary-accent text-white hover:text-white' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium flex-1">{item.title}</span>
                          {item.badge > 0 && (
                            <Badge className="bg-red-500 text-white">
                              {item.badge > 9 ? '9+' : item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            {user && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 relative"
                  onClick={handleOpenNotifications}
                >
                  <Bell className="w-4 h-4" />
                  Notificações
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto bg-red-500 text-white"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>

                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full flex items-center gap-3 px-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  <Avatar className="w-10 h-10 border-2 border-gray-200">
                    <AvatarImage src={user.profile_picture} alt={getUserDisplayName(user)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold">
                      {getInitials(getUserDisplayName(user))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 text-sm truncate">{getUserDisplayName(user)}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-primary font-medium">
                      {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                    </p>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-danger rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-center md:hidden shadow-sm relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
            </div>
            <div className="h-10">
                {appSettings?.logo_url ? (
                    <img src={appSettings.logo_url} alt="Logo" className="h-full w-auto object-contain" />
                ) : (
                    <h1 className="text-xl font-bold text-gray-900">Orion</h1>
                )}
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={handleOpenNotifications}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {user && (
        <>
          <UserProfileModal
            open={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={user}
            onUpdate={loadInitialData}
          />
          
          <NotificationCenter
            open={showNotifications}
            onClose={() => {
              setShowNotifications(false);
              // NOVO: Recarregar contagem ao fechar
              loadUnreadCount();
            }}
            currentUser={user}
            onNotificationClick={handleNotificationClick}
          />

          {selectedItem && showTaskModal && (
            <TaskViewEditModal
              open={showTaskModal}
              onClose={() => {
                setShowTaskModal(false);
                setSelectedItem(null);
              }}
              task={selectedItem}
              currentUser={user}
              users={users}
              departments={departments}
              onUpdate={() => {}}
            />
          )}

          {selectedItem && showServiceModal && (
            <ServiceViewEditModal
              open={showServiceModal}
              onClose={() => {
                setShowServiceModal(false);
                setSelectedItem(null);
              }}
              service={selectedItem}
              currentUser={user}
              users={users}
              departments={departments}
              onUpdate={() => {}}
            />
          )}
        </>
      )}
      <Toaster />
    </SidebarProvider>
    </QueryClientProvider>
  );
}