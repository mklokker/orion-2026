import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, FileText, HardHat, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const findUser = (nameFragment, users) => {
  const normalizedFragment = normalizeText(nameFragment).replace(":", "");
  
  // Tenta match exato primeiro
  const exactMatch = users.find(u => 
    normalizeText(u.display_name || u.full_name || "").includes(normalizedFragment)
  );
  
  if (exactMatch) return exactMatch;
  
  // Tenta match parcial (primeiro nome)
  const firstNameMatch = users.find(u => {
    const firstName = normalizeText((u.display_name || u.full_name || "").split(" ")[0]);
    return firstName === normalizedFragment;
  });
  
  return firstNameMatch || null;
};

const parseDate = (dateStr) => {
  // Formato dd/mm
  const [day, month] = dateStr.split("/").map(Number);
  const year = new Date().getFullYear();
  // Criar data (mês é 0-indexed)
  const date = new Date(year, month - 1, day);
  return date.toISOString().split('T')[0]; // yyyy-mm-dd
};

export default function BulkTextLaunchModal({ open, onClose, users, onCreateTasks, onCreateServices }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep] = useState("input"); // input | preview

  const handleProcess = () => {
    const lines = text.split("\n").filter(l => l.trim());
    let currentUser = null;
    const items = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Regex para identificar itens: Termina com data dd/mm
      // Aceita separadores - ou espaço
      const itemRegex = /^(.*?)(?:[- ]+)(\d{1,2}\/\d{1,2})$/;
      const match = trimmedLine.match(itemRegex);
      
      if (match) {
        // É um item
        const fullContent = match[1];
        const dateStr = match[2];
        
        // Separar identificador e descrição
        // Se tiver traço, separa. Se não, é só identificador.
        // Cuidado: S25... não tem traço. 339323-Busca... tem traço.
        let identifier = fullContent;
        let description = "";
        
        // Se houver um traço, assumimos que separa ID e Descrição
        // MAS, precisamos garantir que não quebre códigos que tenham traço (se houver)
        // O exemplo mostra "339323-Busca para indisponibilidade"
        const dashIndex = fullContent.indexOf("-");
        if (dashIndex > 0) {
            identifier = fullContent.substring(0, dashIndex).trim();
            description = fullContent.substring(dashIndex + 1).trim();
        }

        // Determinar Tipo: Protocolo (Tarefa) vs Serviço
        // Lógica: Se tiver ponto (123.456), é Tarefa. Senão, Serviço.
        const isTask = identifier.includes(".");
        
        items.push({
            type: isTask ? "task" : "service",
            rawUser: currentUser ? currentUser.raw : "Sem usuário",
            user: currentUser ? currentUser.user : null,
            identifier,
            description,
            dateStr,
            formattedDate: parseDate(dateStr),
            priority: "P3", // Default
            originalLine: line
        });
      } else {
        // Assumimos que é um cabeçalho de usuário
        // Remove : do final se houver
        const nameClean = trimmedLine.replace(/:$/, "");
        const foundUser = findUser(nameClean, users);
        currentUser = {
            raw: nameClean,
            user: foundUser
        };
      }
    });
    
    setParsedItems(items);
    setStep("preview");
  };
  
  const handleConfirm = () => {
    const tasksToCreate = [];
    const servicesToCreate = [];
    
    const validItems = parsedItems.filter(i => i.user);
    
    if (validItems.length === 0) {
        toast({ title: "Erro", description: "Nenhum item válido para importar.", variant: "destructive" });
        return;
    }

    validItems.forEach(item => {
        if (item.type === "task") {
            tasksToCreate.push({
                protocol: item.identifier,
                description: item.description || `Tarefa ${item.identifier}`,
                end_date: item.formattedDate,
                priority: item.priority,
                assigned_to: item.user.email,
                status: "Pendente"
            });
        } else {
            servicesToCreate.push({
                service_name: item.identifier,
                description: item.description || `Serviço ${item.identifier}`,
                end_date: item.formattedDate,
                priority: item.priority,
                assigned_to: item.user.email,
                status: "Em Execução" // Default para serviços conforme entidade
            });
        }
    });
    
    if (tasksToCreate.length > 0) onCreateTasks(tasksToCreate, "Importação em Lote (Texto)");
    if (servicesToCreate.length > 0) onCreateServices(servicesToCreate);
    
    onClose();
    setText("");
    setParsedItems([]);
    setStep("input");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lançamento em Lote (Texto)</DialogTitle>
        </DialogHeader>
        
        {step === "input" ? (
            <div className="flex-1 flex flex-col gap-4 min-h-[300px]">
                <p className="text-sm text-gray-500">
                    Cole o texto abaixo. Use o formato: <br/>
                    <span className="font-mono text-xs">Nome do Usuário:<br/>Identificador-Descrição-Data (dd/mm)<br/>Identificador Data (dd/mm)</span>
                </p>
                <Textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder={`Márcia:
S25110760575D-02/12
339323-Busca para indisponibilidade-03/12

Marcos:
123.456 12/12`}
                />
            </div>
        ) : (
            <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
                <div className="mb-2 flex justify-between items-center">
                    <span className="text-sm font-medium">Pré-visualização ({parsedItems.length} itens)</span>
                    <Badge variant="outline" className="text-xs">
                        {parsedItems.filter(i => !i.user).length} erros
                    </Badge>
                </div>
                <ScrollArea className="flex-1 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Identificador</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedItems.map((item, idx) => (
                                <TableRow key={idx} className={!item.user ? "bg-red-50" : ""}>
                                    <TableCell>
                                        {item.user ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-500" title={`Usuário '${item.rawUser}' não encontrado`} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.user ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{item.user.display_name || item.user.full_name}</span>
                                                <span className="text-[10px] text-gray-500">{item.user.email}</span>
                                            </div>
                                        ) : (
                                            <span className="text-red-600 font-medium">{item.rawUser}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={item.type === 'task' ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}>
                                            {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
                                    <TableCell className="text-xs text-gray-500 truncate max-w-[150px]">{item.description || "-"}</TableCell>
                                    <TableCell className="text-xs">{item.dateStr}</TableCell>
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
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleProcess} disabled={!text.trim()}>
                        Processar Texto <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => setStep("input")}>Voltar</Button>
                    <Button onClick={handleConfirm} disabled={parsedItems.filter(i => i.user).length === 0}>
                        Confirmar Lançamento
                    </Button>
                </>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}