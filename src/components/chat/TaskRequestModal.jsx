import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, ArrowRight, Trash2, Send, ListPlus, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

const TaskRequest = base44.entities.TaskRequest;
const Department  = base44.entities.Department;

const DEPT_ORDER = ["Registro","Conferencia","Certidão","ONR","Cadastro","Finalização","Arquivo","Atendimento","Administrativo"];
const sortDepts = (arr) => [...arr].sort((a, b) => {
  const ai = DEPT_ORDER.findIndex(n => a.name?.toLowerCase() === n.toLowerCase());
  const bi = DEPT_ORDER.findIndex(n => b.name?.toLowerCase() === n.toLowerCase());
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
});

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
  onSendMessage,
  departments: deptsProp = null,
}) {
  const { toast } = useToast();
  const [text, setText]               = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep]               = useState("input");
  const [sending, setSending]         = useState(false);

  // Department — obrigatório na criação
  const [departments, setDepartments]   = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    if (!open) return;
    if (deptsProp) {
      setDepartments(sortDepts(deptsProp));
    } else {
      setLoadingDepts(true);
      Department.list()
        .then(d => setDepartments(sortDepts(d)))
        .catch(() => {})
        .finally(() => setLoadingDepts(false));
    }
  }, [open]);

  const handleProcess = () => {
    if (!departmentId) {
      toast({ 
        title: "Departamento obrigatório", 
        description: "Selecione o departamento de destino antes de continuar.", 
        variant: "destructive" 
      });
      return;
    }

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
    if (!departmentId) {
      toast({ title: "Departamento obrigatório", description: "Selecione o departamento de destino.", variant: "destructive" });
      setStep("input");
      return;
    }

    setSending(true);
    try {
      const deptName = departments.find(d => d.id === departmentId)?.name || "";

      const request = await TaskRequest.create({
        requester_email:  currentUser.email,
        requester_name:   currentUser.display_name || currentUser.full_name || currentUser.email,
        conversation_id:  conversationId,
        department_id:    departmentId,
        department_name:  deptName,
        items: validItems.map(item => ({
          type:        item.type,
          identifier:  item.identifier,
          description: item.description,
          end_date:    item.formattedDate
        })),
        status: "pending"
      });

      const taskCount    = validItems.filter(i => i.type === "task").length;
      const serviceCount = validItems.filter(i => i.type === "service").length;
      
      const itemsList = validItems.map(item => 
        `• ${item.type === "task" ? "📋" : "🔧"} ${item.identifier}${item.description ? ` - ${item.description}` : ""} (${item.dateStr})`
      ).join("\n");

      const messageContent = `📝 **Solicitação de Criação de Tarefas/Serviços**\n\n` +
        `${taskCount > 0 ? `**Tarefas:** ${taskCount}\n` : ""}` +
        `${serviceCount > 0 ? `**Serviços:** ${serviceCount}\n` : ""}` +
        `**Departamento:** ${deptName}\n\n` +
        `**Itens:**\n${itemsList}\n\n` +
        `_Aguardando aprovação de um administrador._\n` +
        `\`ID: ${request.id}\``;

      await onSendMessage({
        content:         messageContent,
        type:            "text",
        task_request_id: request.id
      });

      toast({ 
        title: "Solicitação enviada!", 
        description: `${validItems.length} item(s) enviado(s) para ${deptName}.`
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
    setDepartmentId("");
    onClose();
  };

  const validCount   = parsedItems.filter(i => i.valid).length;
  const invalidCount = parsedItems.filter(i => !i.valid).length;
  const deptName     = departments.find(d => d.id === departmentId)?.name || "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            Solicitar Tarefas/Serviços
          </DialogTitle>
        </DialogHeader>
        
        {step === "input" ? (
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-[250px]">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
              <p className="text-blue-800 dark:text-blue-300">
                📝 Envie uma solicitação para os administradores criarem tarefas ou serviços para você.
              </p>
            </div>

            {/* Departamento — obrigatório */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Departamento de destino
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              {loadingDepts ? (
                <div className="h-9 bg-muted animate-pulse rounded-md" />
              ) : (
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className={!departmentId ? "border-amber-300 dark:border-amber-600" : ""}>
                    <SelectValue placeholder="Selecione o departamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!departmentId && !loadingDepts && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Obrigatório — escolha o departamento que irá receber e processar esta solicitação.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Lista de Itens</label>
              <p className="text-xs text-muted-foreground">
                Formato: <span className="font-mono bg-muted px-1 rounded">Protocolo dd/mm</span> ou <span className="font-mono bg-muted px-1 rounded">Serviço-Descrição dd/mm</span>
              </p>
              <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="font-mono text-sm min-h-[150px]"
                placeholder={`Exemplos:\n123.456 12/03\nS25110760575D-02/03\n339323-Busca para indisponibilidade-03/03`}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-[250px] gap-3">
            {/* Confirmação de departamento */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Departamento:</span>
              <span className="font-medium">{deptName}</span>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <span className="text-sm font-medium">Pré-visualização ({validCount} item(s))</span>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-xs">{invalidCount} inválido(s)</Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedItems.map((item, idx) => (
                    <TableRow key={idx} className={!item.valid ? "bg-red-50 dark:bg-red-900/20" : ""}>
                      <TableCell>
                        {item.valid
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <AlertCircle className="w-4 h-4 text-red-500" />}
                      </TableCell>
                      <TableCell>
                        {item.valid ? (
                          <Badge variant="outline" className={item.type === 'task'
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                          }>
                            {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inválido</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:table-cell">{item.description || "-"}</TableCell>
                      <TableCell className="text-xs">{item.dateStr || "-"}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
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
        
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancelar</Button>
              <Button 
                onClick={handleProcess} 
                disabled={!text.trim() || !departmentId || loadingDepts}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              >
                Processar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")} className="w-full sm:w-auto">Voltar</Button>
              <Button 
                onClick={handleSendRequest} 
                disabled={validCount === 0 || sending}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
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