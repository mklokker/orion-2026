import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X, Search, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function CreateServicesModal({ open, onClose, users, departments, onCreateServices }) {
  const [commonData, setCommonData] = useState({
    assigned_to: "",
    department_id: "",
    observations: ""
  });

  const [services, setServices] = useState([{
    service_name: "",
    details: "",
    end_date: "",
    priority: "P3",
    status: "Em Execução"
  }]);

  const [isCreating, setIsCreating] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Função para normalizar texto (remover acentos e pontuação)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "");
  };

  // Ordenar usuários alfabeticamente pelo nome
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA = (a.display_name || a.full_name || a.email).toLowerCase();
      const nameB = (b.display_name || b.full_name || b.email).toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  }, [users]);

  const selectedUser = users.find(u => u.email === commonData.assigned_to);

  const handleAddService = () => {
    setServices([...services, {
      service_name: "",
      details: "",
      end_date: "",
      priority: "P3",
      status: "Em Execução"
    }]);
  };

  const handleRemoveService = (index) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const handleServiceChange = (index, field, value) => {
    const newServices = [...services];
    newServices[index][field] = value;
    setServices(newServices);
  };

  const parseDate = (input, year) => {
    if (!input) return "";
    
    // Remove qualquer caractere que não seja número
    const numbersOnly = input.replace(/\D/g, '');
    
    // Se tem 4 dígitos, interpreta como DDMM
    if (numbersOnly.length === 4) {
      const day = numbersOnly.substring(0, 2);
      const month = numbersOnly.substring(2, 4);
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Se já está no formato YYYY-MM-DD, retorna como está
    if (input.includes('-') && input.length === 10) {
      return input;
    }
    
    return "";
  };

  const handleCreate = async () => {
    if (!commonData.assigned_to || !commonData.department_id) {
      alert("Por favor, preencha o usuário e departamento");
      return;
    }

    const currentYear = new String(new Date().getFullYear());
    
    const servicesToCreate = services.map(service => {
      if (!service.service_name || !service.end_date) {
        return null;
      }
      
      const parsedDate = parseDate(service.end_date, currentYear);
      if (!parsedDate) {
        return null;
      }

      return {
        service_name: service.service_name,
        details: service.details,
        end_date: parsedDate,
        priority: service.priority,
        status: service.status,
        assigned_to: commonData.assigned_to,
        department_id: commonData.department_id,
        observations: commonData.observations
      };
    }).filter(Boolean);

    if (servicesToCreate.length === 0) {
      alert("Por favor, preencha todos os nomes de serviços e datas corretamente");
      return;
    }

    setIsCreating(true);
    await onCreateServices(servicesToCreate);
    setIsCreating(false);
    
    // Reset form
    setCommonData({ assigned_to: "", department_id: "", observations: "" });
    setServices([{ service_name: "", details: "", end_date: "", priority: "P3", status: "Em Execução" }]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Criar Serviços</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Atribuir serviços a</Label>
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
                              value={normalizeText(displayName)}
                              onSelect={() => {
                                setCommonData({...commonData, assigned_to: user.email});
                                setUserSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  commonData.assigned_to === user.email ? "opacity-100" : "opacity-0"
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
              <Label>Departamento</Label>
              <Select value={commonData.department_id} onValueChange={(value) => setCommonData({...commonData, department_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento" />
                </SelectTrigger>
                <SelectContent>
                  {[...departments].sort((a, b) => {
                    const priority = ['registro', 'conferencia', 'certidão', 'certidao'];
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const aIndex = priority.findIndex(p => aName.includes(p));
                    const bIndex = priority.findIndex(p => bName.includes(p));
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return aName.localeCompare(bName, 'pt-BR');
                  }).map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Adicione observações comuns..."
                value={commonData.observations}
                onChange={(e) => setCommonData({...commonData, observations: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          {/* Individual Services */}
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-lg">Serviços</h3>
            
            {services.map((service, index) => (
              <div key={index} className="bg-white border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Serviço {index + 1}</span>
                  {services.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveService(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nome do Serviço</Label>
                    <Input
                      placeholder="Nome do serviço"
                      value={service.service_name}
                      onChange={(e) => handleServiceChange(index, "service_name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Detalhes do serviço</Label>
                    <Textarea
                      placeholder="Descreva os detalhes do serviço..."
                      value={service.details}
                      onChange={(e) => handleServiceChange(index, "details", e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Término (DDMM)</Label>
                      <Input
                        placeholder="Ex: 1511"
                        value={service.end_date}
                        onChange={(e) => handleServiceChange(index, "end_date", e.target.value)}
                        maxLength={4}
                      />
                      <p className="text-xs text-gray-500">
                        Ano: {new Date().getFullYear()}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={service.priority} onValueChange={(value) => handleServiceChange(index, "priority", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="P1">P1</SelectItem>
                          <SelectItem value="P2">P2</SelectItem>
                          <SelectItem value="P3">P3</SelectItem>
                          <SelectItem value="P4">P4</SelectItem>
                          <SelectItem value="P5">P5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={service.status} onValueChange={(value) => handleServiceChange(index, "status", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Execução">Em Execução</SelectItem>
                          <SelectItem value="Atrasada">Atrasada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleAddService}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Serviço
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {isCreating ? "Criando..." : "Criar Serviços"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}