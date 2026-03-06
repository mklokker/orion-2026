import React from "react";
import { Button } from "@/components/ui/button";
import { Filter, CheckCircle2, CircleCheck, FileCheck, Tags, X, BarChart3 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const FILTER_OPTIONS = [
  { value: "all", label: "Todas", icon: null },
  { value: "tagged", label: "Somente marcadas", icon: Tags },
  { value: "feito", label: "Feito", icon: CheckCircle2, color: "text-blue-600" },
  { value: "realizado", label: "Realizado", icon: CircleCheck, color: "text-green-600" },
  { value: "conciliado", label: "Conciliado", icon: FileCheck, color: "text-amber-600" },
];

export default function StatusTagFilter({ value, onChange, messages = [] }) {
  const [open, setOpen] = React.useState(false);
  const [showSummary, setShowSummary] = React.useState(false);

  const counts = React.useMemo(() => {
    const c = { feito: 0, realizado: 0, conciliado: 0, tagged: 0 };
    messages.forEach(m => {
      if (m.status_tag && m.status_tag !== "none") {
        c[m.status_tag] = (c[m.status_tag] || 0) + 1;
        c.tagged++;
      }
    });
    return c;
  }, [messages]);

  const isFiltered = value !== "all";
  const activeOption = FILTER_OPTIONS.find(o => o.value === value);

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isFiltered ? "default" : "ghost"}
            size="sm"
            className={`h-8 gap-1.5 text-xs ${isFiltered ? "" : ""}`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeOption?.label || "Filtro"}</span>
            {isFiltered && (
              <span className="bg-primary-foreground/20 rounded-full px-1.5 text-xs">
                {value === "tagged" ? counts.tagged : counts[value] || 0}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1.5" align="start">
          <div className="space-y-0.5">
            {FILTER_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const count = opt.value === "all" ? null : opt.value === "tagged" ? counts.tagged : counts[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors ${
                    value === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  {Icon && <Icon className={`w-4 h-4 ${value !== opt.value && opt.color ? opt.color : ""}`} />}
                  {!Icon && <span className="w-4" />}
                  <span className="flex-1 text-left">{opt.label}</span>
                  {count !== null && count > 0 && (
                    <span className={`text-xs px-1.5 rounded-full ${
                      value === opt.value ? "bg-primary-foreground/20" : "bg-muted"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {isFiltered && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange("all")} title="Limpar filtro">
          <X className="w-3.5 h-3.5" />
        </Button>
      )}

      {/* Summary button */}
      <Popover open={showSummary} onOpenChange={setShowSummary}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Resumo de status">
            <BarChart3 className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <h4 className="text-sm font-semibold mb-2">Resumo de Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" /> Feito
              </span>
              <span className="font-semibold">{counts.feito}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <CircleCheck className="w-4 h-4 text-green-600" /> Realizado
              </span>
              <span className="font-semibold">{counts.realizado}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-amber-600" /> Conciliado
              </span>
              <span className="font-semibold">{counts.conciliado}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold">
              <span>Total marcadas</span>
              <span>{counts.tagged}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}