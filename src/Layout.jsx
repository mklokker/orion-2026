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
  Users,
  ScrollText,
  Building2,
  ChevronDown,
  Target,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import { Notification as NotificationEntity } from "@/entities/Notification";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { AppSettings } from "@/entities/AppSettings";

import UserProfileModal from "./components/profile/UserProfileModal";
import NotificationCenter from "./components/notifications/NotificationCenter";
import TaskViewEditModal from "./components/tasks/TaskViewEditModal";
import ServiceViewEditModal from "./components/services/ServiceViewEditModal";
import { Toaster } from "./components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MobileBottomNav from "./components/mobile/MobileBottomNav";
import MobileMoreMenu from "./components/mobile/MobileMoreMenu";

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
  const [notificationPermission, setNotificationPermission] = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  
  const unreadChatCount = 0;




  
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [showServiceModal, setShowServiceModal] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [showMobileMore, setShowMobileMore] = React.useState(false);

  const isAdmin = user?.role === 'admin';

  const navigationItems = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Gestão de Tarefas", url: createPageUrl("GestaoTarefas"), icon: ClipboardList },
    { title: "Carga Diária", url: createPageUrl("CargaDiaria"), icon: FileText },
    { title: "Chat", url: createPageUrl("Chat"), icon: MessageSquare, badge: unreadChatCount },
    { title: "Acervo", url: createPageUrl("Acervo"), icon: Files },
    { title: "Cursos", url: createPageUrl("Cursos"), icon: GraduationCap },
    { title: "Atas e Alinhamentos", url: createPageUrl("AtasAlinhamentos"), icon: ScrollText },
    { title: "Removedor", url: createPageUrl("Removedor"), icon: Eraser },
    { title: "Ranking", url: createPageUrl("Ranking"), icon: Star },
  ];

  const gestaoRIItems = isAdmin ? [
    { title: "Plano de Ação", url: createPageUrl("PlanoAcao"), icon: Target },
    { title: "Produtividade Geral", url: createPageUrl("ProdutividadeGeral"), icon: TrendingUp },
    { title: "Relatórios", url: createPageUrl("Relatorios"), icon: BarChart3 },
    { title: "Mapa de Funcionários", url: createPageUrl("MapaFuncionarios"), icon: Users },
    { title: "Administração", url: createPageUrl("Admin"), icon: Settings }
  ] : [];

  const isGestaoRIActive = gestaoRIItems.some(item => location.pathname === item.url);
  const [gestaoRIOpen, setGestaoRIOpen] = React.useState(isGestaoRIActive);

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
      
      const notifications = await NotificationEntity.filter({
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
                  
                  {/* Gestão RI - Menu com sub-itens (apenas para admins) */}
                  {isAdmin && (
                    <Collapsible open={gestaoRIOpen} onOpenChange={setGestaoRIOpen}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`hover:bg-blue-50 hover:text-primary transition-all duration-200 rounded-lg mb-1 w-full ${
                              isGestaoRIActive ? 'bg-gradient-to-r from-primary to-primary-accent text-white hover:text-white' : ''
                            }`}
                          >
                            <Building2 className="w-5 h-5" />
                            <span className="font-medium flex-1">Gestão RI</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${gestaoRIOpen ? 'rotate-180' : ''}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {gestaoRIItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  className={`hover:bg-blue-50 hover:text-primary transition-all duration-200 rounded-lg ${
                                    location.pathname === subItem.url ? 'bg-blue-100 text-primary font-semibold' : ''
                                  }`}
                                >
                                  <Link to={subItem.url} className="flex items-center gap-2">
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            {user && (
              <div className="space-y-3">
                {notificationPermission !== 'granted' && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start gap-2 animate-pulse font-bold"
                    onClick={() => {
                      Notification.requestPermission().then(perm => {
                        setNotificationPermission(perm);
                        if (perm === 'granted') {
                          new Notification("Notificações Ativadas!", { body: "Você receberá alertas intrusivos agora." });
                        }
                      });
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    ATIVAR ALERTAS
                  </Button>
                )}

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

          <div className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          onMoreClick={() => setShowMobileMore(true)}
          unreadChatCount={unreadChatCount}
        />
        
        {/* Mobile More Menu */}
        <MobileMoreMenu 
          open={showMobileMore}
          onClose={() => setShowMobileMore(false)}
          isAdmin={isAdmin}
        />
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