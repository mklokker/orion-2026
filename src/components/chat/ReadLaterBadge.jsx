import React from "react";
import { Bookmark } from "lucide-react";

/**
 * Badge/indicador visual de "Ler depois" para conversas
 */
export function ReadLaterBadge({ isReadLater = false, className = "" }) {
  if (!isReadLater) return null;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 ${className}`}
      title="Marcada para ler depois"
    >
      <Bookmark className="w-3 h-3 text-blue-600 dark:text-blue-400 fill-current" />
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Ler depois</span>
    </div>
  );
}