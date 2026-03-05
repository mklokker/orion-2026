import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateBR } from "@/components/utils/dateUtils";

/**
 * ReadReceiptBadge component
 * Para grupos: mostra "Visto por X" com modal listando todos
 */
export default function ReadReceiptBadge({ message, users, isGroup = false }) {
  const [showModal, setShowModal] = useState(false);

  if (!isGroup || !message) return null;

  const readByArray = message.read_by || [];
  const otherReads = readByArray.filter(r => r.email); // Filtrar válidos
  
  if (otherReads.length === 0) return null;

  const readByNames = useMemo(() => {
    return otherReads.map(r => {
      const user = users?.find(u => u.email === r.email);
      // Prioridade: display_name > full_name > email
      const displayName = user?.display_name || user?.full_name || r.email;
      return {
        name: displayName,
        email: r.email,
        readAt: r.read_at
      };
    });
  }, [otherReads, users]);

  return (
    <>
      <Badge
        variant="secondary"
        className="text-xs cursor-pointer hover:bg-secondary/80"
        onClick={() => setShowModal(true)}
      >
        👁️ Visto por {otherReads.length}
      </Badge>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Visto por ({otherReads.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {readByNames.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{r.name || r.email}</p>
                  {r.name && r.email && (
                    <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  )}
                </div>
                {r.readAt && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2 whitespace-nowrap">
                    {formatDateBR(r.readAt, "HH:mm")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}