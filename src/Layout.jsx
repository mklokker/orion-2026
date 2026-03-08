import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronLeft,
  Target,
  Sun,
  Moon,
  Pin,
  PinOff,
  Menu,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
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
import { useToast } from "./components/ui/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MobileBottomNav from "./components/mobile/MobileBottomNav";
import MobileMoreMenu from "./components/mobile/MobileMoreMenu";
import { useChatNotifications, useGlobalUnreadCount, setGlobalUnread } from "./components/chat/useChatNotifications";
import { UserPresence } from "@/entities/UserPresence";
import { NotificationProvider, useNotifications } from "./components/notifications/NotificationContext";
import { useNotificationSync } from "./components/notifications/useNotificationSync";


const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getUserDisplayName = (user) => user?.display_name || user?.full_name || "Usuário";

const SETTINGS_CACHE_KEY = "orion_app_settings";
const SETTINGS_CACHE_DURATION = 1000 * 60 * 60;

const getCachedSettings = () => {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < SETTINGS_CACHE_DURATION) return data;
    }
  } catch {}
  return null;
};

const setCachedSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ data: settings, timestamp: Date.now() }));
  } catch {}
};

// ─────────────────────────────────────────────
// Sidebar Nav Item
// ─────────────────────────────────────────────
function NavItem({ item, isActive, expanded, onClick }) {
  const content = (
    <Link
      to={item.url}
      onClick={onClick}
      aria-label={item.title}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full font-semibold
        ${isActive
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
        }
      `}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      <span
        className={`font-medium text-sm whitespace-nowrap overflow-hidden ${
          expanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0"
        }`}
        style={{
          transform: expanded ? "translateX(0)" : "translateX(-8px)",
          transition: "opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), transform 300ms cubic-bezier(0.22, 1, 0.36, 1), max-width 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {item.title}
      </span>
      {item.badge > 0 && expanded && (
        <Badge className="ml-auto bg-red-500 text-white text-xs shrink-0">
          {item.badge > 9 ? "9+" : item.badge}
        </Badge>
      )}
      {item.badge > 0 && !expanded && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </Link>
  );

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-sm">
          {item.title}
          {item.badge > 0 && ` (${item.badge})`}
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

// ─────────────────────────────────────────────
// Gestão RI sub-group
// ─────────────────────────────────────────────
function GestaoRIGroup({ items, expanded, isActive, currentPath, onClick }) {
  const [open, setOpen] = React.useState(isActive);

  const trigger = (
    <button
      onClick={() => expanded && setOpen(o => !o)}
      aria-label="Gestão RI"
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full
        ${isActive
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
        }
      `}
    >
      <Building2 className="w-5 h-5 shrink-0" />
      <span
        className={`font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden ${expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"}`}
        style={{
          transform: expanded ? "translateX(0)" : "translateX(-8px)",
          transition: "opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), transform 300ms cubic-bezier(0.22, 1, 0.36, 1), max-width 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        Gestão RI
      </span>
      {expanded && (
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      )}
    </button>
  );

  return (
    <div>
      {!expanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">Gestão RI</TooltipContent>
        </Tooltip>
      ) : trigger}

      {expanded && open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {items.map(sub => (
            <Link
              key={sub.title}
              to={sub.url}
              onClick={onClick}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors duration-150 ${
                currentPath === sub.url
                  ? "bg-accent text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <sub.icon className="w-4 h-4 shrink-0" />
              {sub.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sidebar Content (shared desktop + mobile)
// ─────────────────────────────────────────────
function SidebarContent({
  expanded,
  pinned,
  onTogglePin,
  user,
  appSettings,
  navigationItems,
  gestaoRIItems,
  isAdmin,
  isGestaoRIActive,
  location,
  isDarkMode,
  toggleTheme,
  notificationPermission,
  onRequestNotification,
  unreadCount,
  onOpenNotifications,
  onShowProfile,
  onLogout,
  onNavClick,
}) {
  const themeLabel = isDarkMode ? "Escuro" : "Claro";
  return (
    <div className="flex flex-col h-full">
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
        <Link to={createPageUrl("Dashboard")} onClick={onNavClick} className="flex items-center gap-2 min-w-0">
          {appSettings?.logo_url ? (
            <img
              src={appSettings.logo_url}
              alt="Logo"
              className={`object-contain ${expanded ? "h-10 max-w-[140px]" : "h-8 w-8"}`}
              style={{
                transition: "height 350ms cubic-bezier(0.22, 1, 0.36, 1), max-width 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
          )}
          {expanded && !appSettings?.logo_url && (
            <span
              className="font-bold text-foreground text-base truncate"
              style={{
                opacity: expanded ? 1 : 0,
                transition: "opacity 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              Orion
            </span>
          )}
        </Link>
        {expanded && onTogglePin && (
          <button
            onClick={onTogglePin}
            title={pinned ? "Desafixar sidebar" : "Fixar sidebar aberta"}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navigationItems.map(item => (
          <NavItem
            key={item.title}
            item={item}
            isActive={location.pathname === item.url}
            expanded={expanded}
            onClick={onNavClick}
          />
        ))}

        {isAdmin && gestaoRIItems.length > 0 && (
          <GestaoRIGroup
            items={gestaoRIItems}
            expanded={expanded}
            isActive={isGestaoRIActive}
            currentPath={location.pathname}
            onClick={onNavClick}
          />
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 shrink-0 space-y-1">
        {/* Theme Selector */}
          {expanded ? (
            <button
              onClick={toggleTheme}
              title="Alternar tema"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Moon className="w-4 h-4 shrink-0" />
              <span className="truncate">Tema: {themeLabel}</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleTheme} className="w-full flex justify-center items-center py-2.5 rounded-lg hover:bg-accent text-foreground transition-colors" title="Alternar tema">
                  <Moon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Tema: {themeLabel}</TooltipContent>
            </Tooltip>
          )}

        {/* Notifications */}
        {expanded ? (
          <button
            onClick={onOpenNotifications}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left truncate">Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto bg-red-500 text-white text-xs shrink-0">{unreadCount}</Badge>
            )}
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onOpenNotifications} className="relative w-full flex justify-center items-center py-2.5 rounded-lg hover:bg-accent text-foreground transition-colors">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}</TooltipContent>
          </Tooltip>
        )}

        {/* Push notification alert */}
        {notificationPermission !== "granted" && expanded && (
          <button
            onClick={onRequestNotification}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 animate-pulse transition-colors"
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            ATIVAR ALERTAS
          </button>
        )}

        {/* User profile */}
        {user && (
          <>
            <button
              onClick={onShowProfile}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="w-8 h-8 border border-border shrink-0">
                <AvatarImage src={user.profile_picture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-semibold">
                  {getInitials(getUserDisplayName(user))}
                </AvatarFallback>
              </Avatar>
              {expanded && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-foreground text-xs truncate">{getUserDisplayName(user)}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.role === "admin" ? "Administrador" : "Usuário"}
                  </p>
                </div>
              )}
            </button>

            {expanded ? (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sair
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onLogout} className="w-full flex justify-center py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Layout Content (inner component with context)
// ─────────────────────────────────────────────
function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar state: "collapsed" | "pinned"
  const [sidebarPinned, setSidebarPinned] = React.useState(() => {
    try { return localStorage.getItem("orion_sidebar_pinned") === "true"; } catch { return false; }
  });
  const [hovered, setHovered] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const collapseTimeoutRef = React.useRef(null);

  const handleSidebarMouseEnter = () => {
    if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    setHovered(true);
  };

  const handleSidebarMouseLeave = () => {
    if (!sidebarPinned) {
      collapseTimeoutRef.current = setTimeout(() => {
        setHovered(false);
      }, 280);
    }
  };

  const expanded = sidebarPinned || hovered;

  const togglePin = () => {
    const next = !sidebarPinned;
    setSidebarPinned(next);
    try { localStorage.setItem("orion_sidebar_pinned", String(next)); } catch {}
  };

  // Data state
  const [user, setUser] = React.useState(null);
  const [appSettings, setAppSettings] = React.useState(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [showServiceModal, setShowServiceModal] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [showMobileMore, setShowMobileMore] = React.useState(false);
  const [chatUnreadCounts, setChatUnreadCounts] = React.useState({});
  const [myPresenceGlobal, setMyPresenceGlobal] = React.useState(null);
  const [globalUnreadBadge, setGlobalUnreadBadge] = React.useState(0);

  // Notification Context (single source of truth)
  const {
    unreadCount: notificationUnreadCount,
    notificationPermission,
    requestNotificationPermission,
    restoreSoundPreference
  } = useNotifications();

  // Sync notifications with real-time updates
  useNotificationSync(user?.email, !!user);

  // Track global unread badge for mobile nav
  useGlobalUnreadCount(React.useCallback((n) => setGlobalUnreadBadge(n), []));

  // Scroll preservation
  const scrollPositionsRef = React.useRef({});
  const mainTabRoutes = ["/Dashboard", "/", "/GestaoTarefas", "/Chat", "/Acervo"];
  const isMainTab = mainTabRoutes.includes(location.pathname) || location.pathname === "";

  React.useEffect(() => {
    return () => {
      const el = document.querySelector(".main-content-scroll");
      if (el && isMainTab) scrollPositionsRef.current[location.pathname] = el.scrollTop;
    };
  }, [location.pathname, isMainTab]);

  React.useEffect(() => {
    if (isMainTab) {
      const el = document.querySelector(".main-content-scroll");
      if (el && scrollPositionsRef.current[location.pathname] !== undefined) {
        setTimeout(() => { el.scrollTop = scrollPositionsRef.current[location.pathname]; }, 0);
      }
    }
  }, [location.pathname, isMainTab]);

  // Theme Management (Light/Dark only)
  const [currentTheme, setCurrentTheme] = React.useState(() => {
    const saved = localStorage.getItem("orion_theme");
    // Migrate old themes to light
    if (saved && !["light", "dark"].includes(saved)) {
      localStorage.setItem("orion_theme", "light");
      return "light";
    }
    return saved || "light";
  });

  React.useEffect(() => {
    const html = document.documentElement;
    
    // Theme color mappings (Light/Dark only)
    const themeTokens = {
      light: {
        "--background": "0 0% 100%",
        "--foreground": "222.2 84% 4.9%",
        "--primary": "221.2 83.2% 53.3%",
        "--primary-foreground": "210 40% 98%",
      },
      dark: {
        "--background": "222.2 84% 4.9%",
        "--foreground": "210 40% 98%",
        "--primary": "217.2 91.2% 59.8%",
        "--primary-foreground": "222.2 84% 4.9%",
      },
    };
    
    // Apply data-theme attribute
    html.setAttribute("data-theme", currentTheme);
    
    // Apply .dark class for Tailwind compatibility
    if (currentTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    
    // Force inline CSS vars on html element to override any cascade
    const tokens = themeTokens[currentTheme] || themeTokens.light;
    Object.entries(tokens).forEach(([key, value]) => {
      html.style.setProperty(key, value);
    });
    
    // Force CSS recomputation by triggering a reflow
    void html.offsetHeight;
    
    localStorage.setItem("orion_theme", currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme(currentTheme === "light" ? "dark" : "light");
  };

  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isDashboard = ["/Dashboard", "/", ""].includes(location.pathname);

  // Load my presence for notification preferences
  React.useEffect(() => {
    if (!user?.email) return;
    UserPresence.filter({ user_email: user.email }).then(res => {
      if (res.length > 0) setMyPresenceGlobal(res[0]);
    }).catch(() => {});
  }, [user?.email]);

  // Cross-section chat notification toast
  const handleChatToast = useCallback((title, body, conversationId) => {
    // Don't show toast if user is already on the Chat page
    if (window.location.pathname.toLowerCase().includes("chat")) return;
    toast({
      title: `💬 ${title}`,
      description: body,
      action: (
        <button
          onClick={() => { window.location.href = createPageUrl("Chat"); }}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
        >
          Abrir
        </button>
      ),
    });
  }, [toast]);

  // Global notification hook — only active when NOT on Chat page
  // (the Chat page manages its own unread state and calls setGlobalUnread directly)
  const isOnChatPage = location.pathname.toLowerCase().includes("chat");
  useChatNotifications({
    currentUser: isOnChatPage ? null : user,  // disable when on Chat page
    presence: myPresenceGlobal,
    currentConversationId: null,
    onToast: handleChatToast,
    onUnreadDelta: useCallback((delta) => {
      if (isOnChatPage) return; // Chat page manages its own counts
      setChatUnreadCounts(prev => {
        const next = { ...prev };
        Object.entries(delta).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
        return next;
      });
    }, [isOnChatPage]),
  });

  const totalChatUnread = globalUnreadBadge || Object.values(chatUnreadCounts).reduce((a, b) => a + b, 0);

  const navigationItems = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Gestão de Tarefas", url: createPageUrl("GestaoTarefas"), icon: ClipboardList },
    { title: "Carga Diária", url: createPageUrl("CargaDiaria"), icon: FileText },
    { title: "Chat", url: createPageUrl("Chat"), icon: MessageSquare, badge: totalChatUnread },
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
    { title: "Administração", url: createPageUrl("Admin"), icon: Settings },
  ] : [];

  const isGestaoRIActive = gestaoRIItems.some(i => location.pathname === i.url);

  React.useEffect(() => { 
    loadInitialData(); 
    restoreSoundPreference();
    
    // Verify globals.css is loaded
    const hasGlobalCSS = Array.from(document.styleSheets).some(sheet => {
      try {
        return sheet.href?.includes('globals') || false;
      } catch {
        return false;
      }
    });
    if (!hasGlobalCSS) {
      console.warn('⚠️ globals.css may not be loaded. Check import order in main.jsx');
    }
  }, [restoreSoundPreference]);

  const loadInitialData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      const cached = getCachedSettings();
      if (cached) setAppSettings(cached);
      try {
        const sd = await AppSettings.list();
        if (sd.length > 0) { setAppSettings(sd[0]); setCachedSettings(sd[0]); }
      } catch (e) {
        if (e?.response?.status !== 429) console.error("Settings error:", e);
      }
    } catch (e) { console.error("Init error:", e); }
  };

  const handleNotificationClick = async (notification) => {
    setShowNotifications(false);
    try {
      if (notification.related_item_type === "task") {
        const [tasks, usersData] = await Promise.all([
          Task.filter({ id: notification.related_item_id }),
          User.list().catch(() => [user])
        ]);
        if (tasks.length > 0) { setUsers(usersData); setSelectedItem(tasks[0]); setShowTaskModal(true); }
      } else if (notification.related_item_type === "service") {
        const [services, usersData] = await Promise.all([
          Service.filter({ id: notification.related_item_id }),
          User.list().catch(() => [user])
        ]);
        if (services.length > 0) { setUsers(usersData); setSelectedItem(services[0]); setShowServiceModal(true); }
      }
    } catch (e) { console.error("Notification click error:", e); }
  };

  const sidebarProps = {
    user, appSettings, navigationItems, gestaoRIItems, isAdmin, isGestaoRIActive, location,
    isDarkMode: currentTheme !== "light", toggleTheme, notificationPermission,
    onRequestNotification: requestNotificationPermission,
    unreadCount: notificationUnreadCount,
    onOpenNotifications: () => setShowNotifications(true),
    onShowProfile: () => setShowProfileModal(true),
    onLogout: () => User.logout(),
    pinned: sidebarPinned,
    onTogglePin: togglePin,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        {/* AppSettings custom colors applied as non-conflicting CSS vars */}
        {appSettings && (
          <style>{`
            :root {
              --app-primary: ${appSettings.primary_color || '#2563EB'};
              --app-primary-accent: ${appSettings.primary_accent_color || '#1E40AF'};
              --app-success: ${appSettings.success_color || '#16A34A'};
              --app-danger: ${appSettings.danger_color || '#DC2626'};
            }
          `}</style>
        )}

        <div className="flex w-full bg-background" style={{ height: "100dvh", overflow: "hidden" }}>

          {/* ── Desktop Sidebar ── */}
          <aside
            className="hidden md:flex flex-col shrink-0 bg-card border-r border-border overflow-hidden z-30"
            style={{
              width: expanded ? 260 : 64,
              transition: "width 350ms cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: expanded && !sidebarPinned ? "2px 0 8px rgba(0, 0, 0, 0.08)" : "none",
            }}
            onMouseEnter={handleSidebarMouseEnter}
            onMouseLeave={handleSidebarMouseLeave}
          >
            <SidebarContent {...sidebarProps} expanded={expanded} onNavClick={undefined} />
          </aside>

          {/* ── Mobile Drawer ── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="p-0 w-[260px] flex flex-col">
              <SidebarContent
                {...sidebarProps}
                expanded={true}
                onTogglePin={undefined}
                onNavClick={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* ── Main ── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile top header */}
            <header
              className="md:hidden bg-background/80 backdrop-blur-xl border-b border-border px-4 flex items-center justify-between shadow-sm sticky top-0 z-40"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)", paddingBottom: 8 }}
            >
              <div className="flex items-center gap-2">
                {isDashboard ? (
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="touch-manipulation">
                    <Menu className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="touch-manipulation">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <div className="h-9 flex items-center">
                {appSettings?.logo_url ? (
                  <img src={appSettings.logo_url} alt="Logo" className="h-full w-auto object-contain" />
                ) : (
                  <span className="text-lg font-bold text-foreground">Orion</span>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="relative touch-manipulation"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-5 h-5" />
                {notificationUnreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                  </Badge>
                )}
              </Button>
            </header>

            {/* Page content */}
            <div className="flex-1 overflow-auto pb-20 md:pb-0 main-content-scroll">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMainTab ? "main-tabs" : location.pathname}
                  initial={{ opacity: 0, x: isMainTab ? 0 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isMainTab ? 0 : -20 }}
                  transition={{ duration: isMainTab ? 0 : 0.18, ease: "easeInOut" }}
                  className="h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Mobile bottom nav */}
          <MobileBottomNav onMoreClick={() => setShowMobileMore(true)} unreadChatCount={totalChatUnread} />
          <MobileMoreMenu open={showMobileMore} onClose={() => setShowMobileMore(false)} isAdmin={isAdmin} />
        </div>

        {/* Modals */}
        {user && (
          <>
            <UserProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} onUpdate={loadInitialData} />
            <NotificationCenter
              open={showNotifications}
              onClose={() => setShowNotifications(false)}
              currentUser={user}
              onNotificationClick={handleNotificationClick}
            />
            {selectedItem && showTaskModal && (
              <TaskViewEditModal
                open={showTaskModal}
                onClose={() => { setShowTaskModal(false); setSelectedItem(null); }}
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
                onClose={() => { setShowServiceModal(false); setSelectedItem(null); }}
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────
// Main Layout (with provider wrapper)
// ─────────────────────────────────────────────
export default function Layout({ children, currentPageName }) {
  return (
    <NotificationProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </NotificationProvider>
  );
}