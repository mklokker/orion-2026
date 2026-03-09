import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FileText,
  GraduationCap,
  ScrollText,
  Eraser,
  Star,
  Settings,
  Building2,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  Briefcase,
} from "lucide-react";

const menuItems = [
  { title: "Carga Diária", url: createPageUrl("CargaDiaria"), icon: FileText },
  { title: "Cursos", url: createPageUrl("Cursos"), icon: GraduationCap },
  { title: "Atas e Alinhamentos", url: createPageUrl("AtasAlinhamentos"), icon: ScrollText },
  { title: "Removedor", url: createPageUrl("Removedor"), icon: Eraser },
  { title: "Ranking", url: createPageUrl("Ranking"), icon: Star },
  { title: "Colaboração", url: createPageUrl("Colaboracao"), icon: Briefcase },
];

const adminItems = [
  { title: "Plano de Ação", url: createPageUrl("PlanoAcao"), icon: Target },
  { title: "Produtividade Geral", url: createPageUrl("ProdutividadeGeral"), icon: TrendingUp },
  { title: "Relatórios", url: createPageUrl("Relatorios"), icon: BarChart3 },
  { title: "Mapa de Funcionários", url: createPageUrl("MapaFuncionarios"), icon: Users },
  { title: "Administração", url: createPageUrl("Admin"), icon: Settings },
];

export default function MobileMoreMenu({ open, onClose, isAdmin }) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Mais opções</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-3 gap-3 pb-6">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              onClick={onClose}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-accent transition-colors"
            >
              <item.icon className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground text-center">{item.title}</span>
            </Link>
          ))}
        </div>

        {isAdmin && (
          <>
            <div className="border-t border-border pt-4 pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                <Building2 className="w-4 h-4" />
                Gestão RI
              </div>
              <div className="grid grid-cols-3 gap-3 pb-6">
                {adminItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={onClose}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent hover:bg-accent/70 transition-colors"
                  >
                    <item.icon className="w-6 h-6 text-primary" />
                    <span className="text-xs font-medium text-accent-foreground text-center">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}