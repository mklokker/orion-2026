import React from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Componente de filtros para a lista de conversas
 * Adiciona suporte a filtro "Ler depois"
 */
export function ChatListFilters({
  filter = "all", // "all" | "read_later"
  onFilterChange,
  readLaterCount = 0,
}) {
  return (
    <div className="flex gap-2 px-3 md:px-4 py-2 border-b border-border flex-wrap md:flex-nowrap">
      <Button
        variant={filter === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("all")}
        className="gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Todas
      </Button>
      <Button
        variant={filter === "read_later" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("read_later")}
        className="gap-2"
      >
        <Bookmark className="w-4 h-4" />
        Ler Depois
        {readLaterCount > 0 && (
          <Badge variant="secondary" className="ml-1">{readLaterCount}</Badge>
        )}
      </Button>
    </div>
  );
}