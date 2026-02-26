import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  Files,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Home", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Tarefas", url: createPageUrl("GestaoTarefas"), icon: ClipboardList },
  { title: "Chat", url: createPageUrl("Chat"), icon: MessageSquare },
  { title: "Acervo", url: createPageUrl("Acervo"), icon: Files },
  { title: "Mais", url: "#more", icon: MoreHorizontal },
];

export default function MobileBottomNav({ onMoreClick, unreadChatCount = 0 }) {
  const location = useLocation();

  // Handle main tab navigation - if already on the tab, force navigate to root
  const handleTabClick = (e, url) => {
    if (url === "#more") {
      e.preventDefault();
      onMoreClick?.();
      return;
    }
    
    // If already on this tab's route (or a sub-route), force navigate to root of that tab
    // e.g., if on /GestaoTarefas/123, clicking Tarefas tab should go to /GestaoTarefas
    const isOnThisTab = location.pathname === url || location.pathname.startsWith(url + '/');
    if (isOnThisTab && location.pathname !== url) {
      // We're on a sub-route, let the Link navigate to the root
      // React Router will handle this naturally
    }
    // If already exactly on this route, the Link will still navigate (refresh state)
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 z-50 md:hidden select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = item.url !== "#more" && location.pathname === item.url;
          const isMore = item.url === "#more";
          
          return (
            <Link
              key={item.title}
              to={isMore ? "#" : item.url}
              onClick={(e) => handleTabClick(e, item.url)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors select-none touch-manipulation bottom-nav-item ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400 active:text-gray-900 dark:active:text-gray-100"
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.title === "Chat" && unreadChatCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] bg-red-500"
                  >
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.title}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}