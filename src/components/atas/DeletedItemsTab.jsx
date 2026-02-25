import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Trash2, FileText, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DeletedItemsTab({
  alinhamentos,
  atas,
  users,
  onRestoreAlinhamento,
  onRestoreAta,
  onPermanentDelete,
}) {
  const getUserName = (email) => {
    const user = users.find((u) => u.email === email);
    return user?.display_name || user?.full_name || email;
  };

  const deletedItems = [
    ...alinhamentos.map((a) => ({ ...a, type: "alinhamento" })),
    ...atas.map((a) => ({ ...a, type: "ata" })),
  ].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

  if (deletedItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhum item excluído</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-350px)]">
      <div className="space-y-4">
        {deletedItems.map((item) => (
          <Card key={`${item.type}-${item.id}`} className="border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {item.type === "alinhamento" ? (
                      <Users className="w-4 h-4 text-gray-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {item.type === "alinhamento" ? "Alinhamento" : "Ata"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Excluído em:{" "}
                      {item.deleted_at
                        ? format(new Date(item.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : "-"}
                    </div>
                    <div>Excluído por: {getUserName(item.deleted_by)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      item.type === "alinhamento"
                        ? onRestoreAlinhamento(item.id)
                        : onRestoreAta(item.id)
                    }
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restaurar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O item "{item.title}" será excluído
                          permanentemente do sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onPermanentDelete(item.type, item.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}