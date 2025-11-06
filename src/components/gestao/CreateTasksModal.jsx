
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import { Notification } from "@/entities/Notification";

export default function CreateTasksModal({ open, onClose, users, departments, onCreateTasks }) {
  const currentYear = new Date().getFullYear();
  
  const [commonData, setCommonData] = useState({
    assigned_to: "",
    department_id: "",
    description: "",
    observations: "",
    year: currentYear.toString(),
    status: "Em Execução" // Added status field with default
  });

  const [tasks, setTasks] = useState([{
    protocol: "",
    end_date: "",
    priority: "P3"
  }]);

  const [isCreating, setIsCreating] = useState(false);
  const protocolRefs = useRef([]);

  useEffect(() => {
    protocolRefs.current = protocolRefs.current.slice(0, tasks.length);
  }, [tasks.length]);

  const handleAddTask = () => {
    setTasks([...tasks, {
      protocol: "",
      end_date: "",
      priority: "P3"
    }]);
    
    setTimeout(() => {
      const newIndex = tasks.length;
      if (protocolRefs.current[newIndex]) {
        protocolRefs.current[newIndex].focus();
      }
    }, 100);
  };

  const handleRemoveTask = (index) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const formatDateDisplay = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");
    
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return numbers;
    
    // Formata como DD/MM
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
  };

  const formatDateToISO = (ddmm, year) => {
    if (!ddmm || ddmm.length < 4) return "";
    
    const numbers = ddmm.replace(/\D/g, "");
    const day = numbers.slice(0, 2);
    const month = numbers.slice(2, 4);
    
    // Validação básica
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return "";
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    if (field === "protocol") {
      const numbers = value.replace(/\D/g, "");
      if (numbers.length <= 3) {
        newTasks[index][field] = numbers;
      } else {
        newTasks[index][field] = `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}`;
      }
    } else if (field === "end_date") {
      newTasks[index][field] = value;
    } else {
      newTasks[index][field] = value;
    }
    setTasks(newTasks);
  };

  const handleCreate = async () => {
    if (!commonData.assigned_to || !commonData.department_id) {
      alert("Por favor, preencha o usuário e departamento");
      return;
    }

    // Validar e converter datas
    const tasksWithDates = tasks.map(task => {
      const isoDate = formatDateToISO(task.end_date, commonData.year);
      if (!task.protocol || !isoDate) {
        return null;
      }
      return {
        ...task,
        end_date: isoDate,
        assigned_to: commonData.assigned_to,
        department_id: commonData.department_id,
        description: commonData.description || task.protocol,
        status: commonData.status // Use commonData.status here
      };
    });

    if (tasksWithDates.some(t => t === null)) {
      alert("Por favor, preencha todos os protocolos e datas corretamente");
      return;
    }

    setIsCreating(true);
    
    // NOVO: Criar notificação para o usuário que recebeu as tarefas
    try {
      const assignedUser = users.find(u => u.email === commonData.assigned_to);
      if (assignedUser && tasksWithDates.length > 0) {
        await Notification.create({
          user_email: commonData.assigned_to,
          title: `${tasksWithDates.length} Nova(s) Tarefa(s) Atribuída(s)`,
          message: `Você recebeu ${tasksWithDates.length} nova(s) tarefa(s) no sistema`,
          type: "assigned",
          read: false
        });
      }
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }

    await onCreateTasks(tasksWithDates, commonData.observations);
    setIsCreating(false);
    
    // Reset form
    setCommonData({ 
      assigned_to: "", 
      department_id: "", 
      description: "", 
      observations: "",
      year: currentYear.toString(),
      status: "Em Execução" // Reset status to default
    });
    setTasks([{ protocol: "", end_date: "", priority: "P3" }]);
    onClose();
  };

  const handleAddButtonKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  // Gerar array de anos (5 anos anteriores até 5 anos futuros)
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Criar Novas Tarefas em Lote</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Atribuir tarefas a</Label>
              <Select value={commonData.assigned_to} onValueChange={(value) => setCommonData({...commonData, assigned_to: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.display_name || user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={commonData.department_id} onValueChange={(value) => setCommonData({...commonData, department_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status Inicial</Label>
              <Select value={commonData.status} onValueChange={(value) => setCommonData({...commonData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status inicial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em Execução">Em Execução</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes comuns para todas as tarefas..."
                value={commonData.description}
                onChange={(e) => setCommonData({...commonData, description: e.target.value})}
                rows={3}
              />
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

            <div className="space-y-2">
              <Label>Ano para todas as tarefas</Label>
              <Select value={commonData.year} onValueChange={(value) => setCommonData({...commonData, year: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Este ano será aplicado a todas as datas de término abaixo
              </p>
            </div>
          </div>

          {/* Individual Tasks */}
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-lg">Tarefas Individuais</h3>
            
            {tasks.map((task, index) => (
              <div key={index} className="bg-white border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Tarefa {index + 1}</span>
                  {tasks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTask(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      tabIndex={-1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Protocolo</Label>
                    <Input
                      ref={(el) => protocolRefs.current[index] = el}
                      placeholder="Ex: 123.456"
                      value={task.protocol}
                      onChange={(e) => handleTaskChange(index, "protocol", e.target.value)}
                      maxLength={7}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Término (DD/MM)</Label>
                    <Input
                      type="text"
                      placeholder="Ex: 1010 para 10/10"
                      value={formatDateDisplay(task.end_date)}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/\D/g, "");
                        handleTaskChange(index, "end_date", numbers.slice(0, 4));
                      }}
                      maxLength={5}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={task.priority} onValueChange={(value) => handleTaskChange(index, "priority", value)}>
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
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleAddTask}
              onKeyDown={handleAddButtonKeyDown}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Tarefa
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
              {isCreating ? "Criando..." : "Criar Tarefas em Lote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
