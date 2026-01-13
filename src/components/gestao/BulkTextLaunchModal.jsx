import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, FileText, HardHat, ArrowRight, Search, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

// Ordem fixa dos departamentos
const DEPARTMENT_ORDER = ['registro', 'conferencia', 'certidão', 'certidao', 'onr', 'cadastro', 'finalização', 'finalizacao', 'arquivo', 'atendimento', 'administrativo'];

const sortDepartments = (departments) => {
  return [...departments].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aIndex = DEPARTMENT_ORDER.findIndex(p => aName.includes(p));
    const bIndex = DEPARTMENT_ORDER.findIndex(p => bName.includes(p));
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aName.localeCompare(bName, 'pt-BR');
  });
};

export default function BulkTextLaunchModal({ open, onClose, users, departments = [], onCreateTasks, onCreateServices }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep] = useState("input"); // input | preview
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Função para normalizar texto (remover acentos e pontuação)
  const normalizeSearchText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "");
  };

  // Ordenar usuários alfabeticamente pelo nome
  const sortedUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA = (a.display_name || a.full_name || a.email).toLowerCase();
      const nameB = (b.display_name || b.full_name || b.email).toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  }, [users]);

  const selectedUser = users.find(u => u.email === selectedUserEmail);
  const sortedDepartments = sortDepartments(departments);

  const handleProcess = () => {
    if (!selectedUserEmail) {
        toast({ title: "Erro", description: "Selecione um usuário antes de processar.", variant: "destructive" });
        return;
    }

    const userObj = users.find(u => u.email === selectedUserEmail);
    const lines = text.split("\n").filter(l => l.trim());
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
        let identifier = fullContent;
        let description = "";
        
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
            rawUser: userObj.full_name,
            user: userObj,
            identifier,
            description,
            dateStr,
            formattedDate: parseDate(dateStr),
            priority: "P3", // Default
            originalLine: line
        });
      }
    });
    
    if (items.length === 0) {
        toast({ title: "Aviso", description: "Nenhum item válido encontrado no texto.", variant: "warning" });
        return;
    }
    
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
                department_id: selectedDepartmentId || undefined,
                status: "Pendente"
            });
        } else {
            servicesToCreate.push({
                service_name: item.identifier,
                description: item.description || `Serviço ${item.identifier}`,
                end_date: item.formattedDate,
                priority: item.priority,
                assigned_to: item.user.email,
                department_id: selectedDepartmentId || undefined,
                status: "Em Execução" // Default para serviços conforme entidade
            });
        }
    });
    
    if (tasksToCreate.length > 0) onCreateTasks(tasksToCreate, "Importação em Lote (Texto)");
    if (servicesToCreate.length > 0) onCreateServices(servicesToCreate);
    
    onClose();
    setText("");
    setSelectedUserEmail("");
    setSelectedDepartmentId("");
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
                <div className="space-y-2">
                    <label className="text-sm font-medium">Selecione o Usuário</label>
                    <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={userSearchOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedUser 
                            ? (selectedUser.display_name || selectedUser.full_name || selectedUser.email)
                            : "Selecione ou busque um usuário..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar usuário..." />
                          <CommandList>
                            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                            <CommandGroup>
                              {sortedUsers.map(user => {
                                const displayName = user.display_name || user.full_name || user.email;
                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={normalizeSearchText(displayName)}
                                    onSelect={() => {
                                      setSelectedUserEmail(user.email);
                                      setUserSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedUserEmail === user.email ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {displayName}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Departamento (opcional)</label>
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um departamento..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedDepartments.map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium">Cole a lista de itens</label>
                    <p className="text-xs text-gray-500">
                        Formato aceito: <span className="font-mono">Identificador-Descrição-Data (dd/mm)</span> ou <span className="font-mono">Identificador Data (dd/mm)</span>
                    </p>
                    <Textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="flex-1 font-mono text-sm"
                        placeholder={`S25110760575D-02/12
339323-Busca para indisponibilidade-03/12
123.456 12/12
51046-03/12`}
                    />
                </div>
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