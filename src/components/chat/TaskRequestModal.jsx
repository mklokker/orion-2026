import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, ArrowRight, Trash2, Send, ListPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

const TaskRequest = base44.entities.TaskRequest;
const ChatMessage = base44.entities.ChatMessage;

const parseDate = (dateStr) => {
  const [day, month] = dateStr.split("/").map(Number);
  const year = new Date().getFullYear();
  const date = new Date(year, month - 1, day);
  return date.toISOString().split('T')[0];
};

export default function TaskRequestModal({ 
  open, 
  onClose, 
  currentUser,
  conversationId,
  onSendMessage 
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep] = useState("input");
  const [sending, setSending] = useState(false);

  const handleProcess = () => {
    const lines = text.split("\n").filter(l => l.trim());
    const items = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      const itemRegex = /^(.*?)(?:[- ]+)(\d{1,2}\/\d{1,2})$/;
      const match = trimmedLine.match(itemRegex);
      
      if (match) {
        const fullContent = match[1];
        const dateStr = match[2];
        
        let identifier = fullContent;
        let description = "";
        
        const dashIndex = fullContent.indexOf("-");
        if (dashIndex > 0) {
          identifier = fullContent.substring(0, dashIndex).trim();
          description = fullContent.substring(dashIndex + 1).trim();
        }

        const isTask = identifier.includes(".");
        
        items.push({
          type: isTask ? "task" : "service",
          identifier,
          description,
          dateStr,
          formattedDate: parseDate(dateStr),
          originalLine: line,
          valid: true
        });
      } else if (trimmedLine) {
        items.push({
          type: "unknown",
          identifier: trimmedLine,
          description: "",
          dateStr: "",
          formattedDate: "",
          originalLine: line,
          valid: false
        });
      }
    });
    
    if (items.filter(i => i.valid).length === 0) {
      toast({ 
        title: "Aviso", 
        description: "Nenhum item válido encontrado. Use o formato: Protocolo dd/mm ou Serviço dd/mm", 
        variant: "destructive" 
      });
      return;
    }
    
    setParsedItems(items);
    setStep("preview");
  };

  const handleRemoveItem = (idx) => {
    setParsedItems(prev => prev.filter((_, i) => i !== idx));
  };
  
  const handleSendRequest = async () => {
    const validItems = parsedItems.filter(i => i.valid);
    
    if (validItems.length === 0) {
      toast({ title: "Erro", description: "Nenhum item válido para enviar.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Criar solicitação
      const request = await TaskRequest.create({
        requester_email: currentUser.email,
        requester_name: currentUser.full_name || currentUser.display_name || currentUser.email,
        conversation_id: conversationId,
        items: validItems.map(item => ({
          type: item.type,
          identifier: item.identifier,
          description: item.description,
          end_date: item.formattedDate
        })),
        status: "pending"
      });

      // Enviar mensagem no chat com detalhes
      const taskCount = validItems.filter(i => i.type === "task").length;
      const serviceCount = validItems.filter(i => i.type === "service").length;
      
      let itemsList = validItems.map(item => 
        `• ${item.type === "task" ? "📋" : "🔧"} ${item.identifier}${item.description ? ` - ${item.description}` : ""} (${item.dateStr})`
      ).join("\n");

      const messageContent = `📝 **Solicitação de Criação de Tarefas/Serviços**\n\n` +
        `${taskCount > 0 ? `**Tarefas:** ${taskCount}\n` : ""}` +
        `${serviceCount > 0 ? `**Serviços:** ${serviceCount}\n` : ""}\n` +
        `**Itens:**\n${itemsList}\n\n` +
        `_Aguardando aprovação de um administrador._\n` +
        `\`ID: ${request.id}\``;

      await onSendMessage({
        content: messageContent,
        type: "text",
        task_request_id: request.id
      });

      toast({ 
        title: "Solicitação enviada!", 
        description: `${validItems.length} item(s) enviado(s) para aprovação.`
      });

      handleClose();
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      toast({ 
        title: "Erro ao enviar", 
        description: "Não foi possível enviar a solicitação.", 
        variant: "destructive" 
      });
    }
    setSending(false);
  };

  const handleClose = () => {
    setText("");
    setParsedItems([]);
    setStep("input");
    onClose();
  };

  const validCount = parsedItems.filter(i => i.valid).length;
  const invalidCount = parsedItems.filter(i => !i.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            Solicitar Tarefas/Serviços
          </DialogTitle>
        </DialogHeader>
        
        {step === "input" ? (
          <div className="flex-1 flex flex-col gap-4 min-h-[250px]">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
              <p className="text-blue-800 dark:text-blue-300">
                📝 Envie uma solicitação para os administradores criarem tarefas ou serviços para você.
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-medium">Lista de Itens</label>
              <p className="text-xs text-gray-500">
                Formato: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Protocolo dd/mm</span> ou <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Serviço-Descrição dd/mm</span>
              </p>
              <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 font-mono text-sm min-h-[150px]"
                placeholder={`Exemplos:\n123.456 12/03\nS25110760575D-02/03\n339323-Busca para indisponibilidade-03/03`}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-[250px]">
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm font-medium">Pré-visualização ({validCount} item(s))</span>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {invalidCount} inválido(s)
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedItems.map((item, idx) => (
                    <TableRow key={idx} className={!item.valid ? "bg-red-50 dark:bg-red-900/20" : ""}>
                      <TableCell>
                        {item.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.valid ? (
                          <Badge variant="outline" className={item.type === 'task' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}>
                            {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inválido</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
                      <TableCell className="text-xs text-gray-500 truncate max-w-[120px]">{item.description || "-"}</TableCell>
                      <TableCell className="text-xs">{item.dateStr || "-"}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
        
        <DialogFooter>
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleProcess} disabled={!text.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Processar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>Voltar</Button>
              <Button 
                onClick={handleSendRequest} 
                disabled={validCount === 0 || sending}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : `Enviar Solicitação (${validCount})`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}