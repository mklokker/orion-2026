import React from "react";
import { cn } from "@/lib/utils";

const statusConfig = {
  online: {
    color: "bg-green-500",
    ring: "ring-green-500/30",
    label: "Online"
  },
  away: {
    color: "bg-yellow-500",
    ring: "ring-yellow-500/30",
    label: "Ausente"
  },
  dnd: {
    color: "bg-red-500",
    ring: "ring-red-500/30",
    label: "Não Incomodar"
  },
  offline: {
    color: "bg-gray-400",
    ring: "ring-gray-400/30",
    label: "Offline"
  }
};

export default function PresenceIndicator({ 
  status = "offline", 
  size = "md",
  showRing = false,
  className 
}) {
  const config = statusConfig[status] || statusConfig.offline;
  
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <span
      className={cn(
        "rounded-full border-2 border-white",
        config.color,
        sizeClasses[size],
        showRing && `ring-2 ${config.ring}`,
        className
      )}
      title={config.label}
    />
  );
}

export { statusConfig };