import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateBR } from "@/components/utils/dateUtils";

/**
 * ReadReceipt component
 * Mostra status de entrega (✓) e leitura (✓✓) de uma mensagem
 * Em grupos, mostra "Visto por X" com tooltip listando nomes
 */
export default function ReadReceipt({ 
  message, 
  currentUser, 
  users, 
  isGroup = false,
  className = ""
}) {
  if (!message || !currentUser || message.sender_email !== currentUser.email) {
    return null; // Não mostrar read receipts em mensagens de outros usuários
  }

  // Estrutura:
  // - read_by é array de { email, read_at }
  // - se read_by está vazio, ninguém leu ainda (apenas entregue)
  const readByArray = message.read_by || [];
  const hasReads = readByArray.length > 0;

  // Filtrar: remover o sender da lista de "lido por" (não contar a si mesmo)
  const otherReads = readByArray.filter(r => r.email !== currentUser.email);
  const hasOtherReads = otherReads.length > 0;

  // Obter nomes dos que leram
  const readByNames = useMemo(() => {
    return otherReads.map(r => {
      const user = users?.find(u => u.email === r.email);
      return {
        name: user?.display_name || user?.full_name || r.email.split("@")[0],
        readAt: r.read_at
      };
    });
  }, [otherReads, users]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    if (isGroup && hasOtherReads) {
      return (
        <div className="text-xs space-y-1">
          <p className="font-semibold">Visto por:</p>
          {readByNames.map((r, idx) => (
            <div key={idx}>
              {r.name} {r.readAt && `- ${formatDateBR(r.readAt, "HH:mm")}`}
            </div>
          ))}
        </div>
      );
    } else if (!isGroup && hasOtherReads) {
      const firstRead = readByNames[0];
      return `Visto às ${formatDateBR(firstRead.readAt, "HH:mm")}`;
    }
    return null;
  }, [isGroup, hasOtherReads, readByNames]);

  // Ícone: ✓ (entregue) ou ✓✓ (visto)
  const checkCount = hasOtherReads ? 2 : 1;
  const checkColor = hasOtherReads ? "text-blue-600" : "text-gray-400";

  if (!tooltipContent) {
    // Sem tooltip, apenas ícone simples
    return (
      <span className={`inline-flex items-center gap-0.5 ${className}`}>
        {Array.from({ length: checkCount }).map((_, i) => (
          <Check key={i} className={`w-3 h-3 ${checkColor}`} />
        ))}
      </span>
    );
  }

  // Com tooltip
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 cursor-help ${className}`}>
            {Array.from({ length: checkCount }).map((_, i) => (
              <Check key={i} className={`w-3 h-3 ${checkColor}`} />
            ))}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}