import React, { useEffect } from "react";
import { useNotificationStore } from "./NotificationStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getNotificationIcon = (type) => {
  const icons = {
    assigned: "📋",
    completed: "✅",
    interaction: "💬",
    transferred: "➡️"
  };
  return icons[type] || "🔔";
};

export default function NotificationCenter({ open, onClose, currentUser, onNotificationClick }) {
  const notifications = useNotificationStore(state => state.notifications);
  const isLoading = useNotificationStore(state => state.isLoading);
  const filter = useNotificationStore(state => state.filter);
  const setFilter = useNotificationStore(state => state.setFilter);
  const loadNotifications = useNotificationStore(state => state.loadNotifications);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);
  const deleteNotification = useNotificationStore(state => state.deleteNotification);

  const filteredNotifications = useNotificationStore(state => state.filteredNotifications());
  const unreadCount = useNotificationStore(state => state.unreadCount());

  // Carrega notificações quando abre a central
  useEffect(() => {
    if (open && currentUser?.email) {
      loadNotifications(currentUser.email);
    }
  }, [open, currentUser?.email, loadNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.related_item_id && notification.related_item_type) {
      onNotificationClick(notification);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Filter buttons - responsive */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-xs sm:text-sm"
              >
                Todas ({notifications.length})
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
                className="text-xs sm:text-sm"
              >
                Não lidas ({unreadCount})
              </Button>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas
              </Button>
            )}
          </div>

          {/* Notifications list */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">
                  {filter === "unread" 
                    ? "Nenhuma notificação não lida"
                    : "Nenhuma notificação"}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                    notification.read 
                      ? "bg-white border-gray-200" 
                      : "bg-blue-50 border-blue-200"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-lg sm:text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold text-xs sm:text-sm break-words ${
                          notification.read ? "text-gray-700" : "text-gray-900"
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <Badge variant="default" className="bg-blue-600 text-xs flex-shrink-0">
                            Nova
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm mt-1 break-words ${
                        notification.read ? "text-gray-500" : "text-gray-700"
                      }`}>
                        {notification.message}
                      </p>
                      {notification.action_by_name && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          Por: {notification.action_by_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(notification.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="gap-1 h-8 text-xs"
                      >
                        <Check className="w-3 h-3" />
                        <span className="hidden sm:inline">Marcar como lida</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="gap-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}