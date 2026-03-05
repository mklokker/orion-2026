import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationStore } from './NotificationStore';

/**
 * Botão sino com badge, consumindo NotificationStore.
 * Sempre sincronizado.
 */
export default function NotificationCentralButton({ onClick }) {
  const unreadCount = useNotificationStore(state => state.unreadCount());

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative touch-manipulation"
      aria-label="Abrir notificações"
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
  );
}