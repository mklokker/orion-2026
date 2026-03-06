import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CheckCircle2, CircleCheck, FileCheck } from "lucide-react";
import { formatDateBR } from "@/components/utils/dateUtils";

const STATUS_CONFIG = {
  feito: {
    label: "Feito",
    icon: CheckCircle2,
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  realizado: {
    label: "Realizado",
    icon: CircleCheck,
    className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  },
  conciliado: {
    label: "Conciliado",
    icon: FileCheck,
    className: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/20",
  },
};

export { STATUS_CONFIG };

export default function StatusTagBadge({ tag, tagBy, tagAt, users = [] }) {
  if (!tag || tag === "none") return null;

  const config = STATUS_CONFIG[tag];
  if (!config) return null;

  const Icon = config.icon;
  const user = users.find(u => u.email === tagBy);
  const userName = user?.display_name || user?.full_name || tagBy || "Alguém";

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const adjusted = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    const day = String(adjusted.getDate()).padStart(2, "0");
    const month = String(adjusted.getMonth() + 1).padStart(2, "0");
    const hours = String(adjusted.getHours()).padStart(2, "0");
    const minutes = String(adjusted.getMinutes()).padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className} cursor-default`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Marcado como {config.label} por {userName}
          {tagAt && ` em ${formatDate(tagAt)}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}