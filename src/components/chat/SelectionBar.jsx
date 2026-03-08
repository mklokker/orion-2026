import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Forward, X, CheckSquare } from "lucide-react";

export default function SelectionBar({ count, onCancel, onDelete, onForward, canDeleteAll }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground shrink-0 z-40">
      <button onClick={onCancel} className="p-1.5 rounded hover:bg-primary-foreground/20 transition-colors">
        <X className="w-4 h-4" />
      </button>

      <span className="flex-1 text-sm font-semibold">
        {count === 0 ? "Nenhuma selecionada" : `${count} selecionada${count !== 1 ? "s" : ""}`}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/20 h-8"
        onClick={onForward}
        disabled={count === 0}
      >
        <Forward className="w-4 h-4" />
        <span className="hidden sm:inline">Encaminhar</span>
      </Button>

      {canDeleteAll && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-primary-foreground hover:bg-red-500/80 h-8"
          onClick={onDelete}
          disabled={count === 0}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Excluir</span>
        </Button>
      )}
    </div>
  );
}