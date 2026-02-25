import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/entities/Task";
import { UserStar } from "@/entities/UserStar";
import { Notification } from "@/entities/Notification"; // Added Notification import
import { Save, X, Calendar, User as UserIcon, Building2, CheckCircle2, ArrowRight, MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import TaskInteractionsModal from "./TaskInteractionsModal";
import { TaskInteraction } from "@/entities/TaskInteraction";

const priorityColors = {
  "P1": "bg-red-500 text-white",
  "P2": "bg-orange-500 text-white",
  "P3": "bg-yellow-500 text-white",
  "P4": "bg-blue-500 text-white",
  "P5": "bg-green-500 text-white"
};

const statusColors = {
  "Pendente": "bg-gray-500 text-white",
  "Em Execução": "bg-blue-500 text-white",
  "Atrasada": "bg-red-500 text-white",
  "Concluída": "bg-green-500 text-white"
};

const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  if (dateString.includes('T')) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  const parts = dateString.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export default function TaskViewEditModal({ open, onClose, task, currentUser, users, departments, onUpdate }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferToUser, setTransferToUser] = useState("");
  const [showInteractionsModal, setShowInteractionsModal] = useState(false);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const isCompleted = task.status === "Concluída";
  const isAdmin = currentUser?.role === 'admin';
  const isMyTask = task.assigned_to === currentUser?.email;
  const canComplete = !isCompleted && isMyTask;
  const canTransfer = !isCompleted;
  const canEdit = !isCompleted;

  const createTaskInteraction = async (type, message, metadata = {}) => {
    try {
      await TaskInteraction.create({
        task_id: task.id,
        interaction_type: type,
        message,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        metadata
      });
    } catch (error) {
      console.error("Erro ao criar interação:", error);
    }
  };

  // Busca o ciclo atual do protocolo (muda quando conferência finaliza)
  const getCurrentCycleId = async (protocol) => {
    try {
      // Busca estrelas existentes para este protocolo
      const existingStars = await UserStar.filter({
        protocol: protocol,
        item_type: "task"
      });
      
      // O cycle_id é gerado quando uma conferência é finalizada
      const cycles = existingStars
        .filter(s => s.cycle_id)
        .map(s => s.cycle_id)
        .sort()
        .reverse();
      
      return cycles.length > 0 ? cycles[0] : "cycle_0";
    } catch (error) {
      console.error("Erro ao buscar ciclo:", error);
      return "cycle_0";
    }
  };

  // Encontra o ID do departamento de Conferência
  const getConferenceDeptId = () => {
    const confDept = departments?.find(d => 
      d.name?.toLowerCase().includes("conferencia") || 
      d.name?.toLowerCase().includes("conferência")
    );
    return confDept?.id;
  };

  const awardStarIfNeeded = async (taskId, protocol, departmentId, isTransfer = false) => {
    try {
      const conferenceDeptId = getConferenceDeptId();
      const isConference = departmentId === conferenceDeptId;
      
      // Busca o ciclo atual
      let currentCycleId = await getCurrentCycleId(protocol);
      
      // Se é conferência e NÃO é transferência, cria um novo ciclo
      if (isConference && !isTransfer) {
        currentCycleId = `cycle_${Date.now()}`;
      }
      
      // Verifica se o usuário já tem estrela para este protocolo NESTE DEPARTAMENTO e NESTE CICLO
      const existingStars = await UserStar.filter({
        user_email: currentUser.email,
        protocol: protocol,
        item_type: "task",
        department_id: departmentId,
        cycle_id: currentCycleId
      });

      if (existingStars.length === 0) {
        // Usuário ainda não tem estrela para este protocolo neste departamento/ciclo
        await UserStar.create({
          user_email: currentUser.email,
          protocol: protocol,
          item_type: "task",
          earned_date: format(new Date(), "yyyy-MM-dd"),
          completed_item_id: taskId,
          department_id: departmentId,
          cycle_id: currentCycleId
        });

        const dept = departments?.find(d => d.id === departmentId);
        toast({
          title: "⭐ Estrela Conquistada!",
          description: `Você ganhou 1 estrela em ${dept?.name || 'Departamento'} ao concluir o protocolo ${protocol}!`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Erro ao verificar/criar estrela:", error);
    }
  };

  // New function to create notifications
  const createNotification = async (userEmail, title, message, type) => {
    try {
      await Notification.create({
        user_email: userEmail,
        title,
        message,
        type,
        related_item_id: task.id,
        related_item_type: "task",
        action_by: currentUser.email,
        action_by_name: currentUser.full_name,
        read: false
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = [];
      if (editedTask.protocol !== task.protocol) changes.push(`Protocolo: ${task.protocol} → ${editedTask.protocol}`);
      if (editedTask.description !== task.description) changes.push(`Descrição alterada`);
      if (editedTask.status !== task.status) changes.push(`Status: ${task.status} → ${editedTask.status}`);
      if (editedTask.priority !== task.priority) changes.push(`Prioridade: ${task.priority} → ${editedTask.priority}`);
      if (editedTask.assigned_to !== task.assigned_to) changes.push(`Responsável: ${task.assigned_to} → ${editedTask.assigned_to}`);
      if (editedTask.end_date !== task.end_date) changes.push(`Data de Término: ${task.end_date} → ${editedTask.end_date}`);

      await Task.update(task.id, editedTask);

      if (changes.length > 0) {
        await createTaskInteraction("updated", `${currentUser.full_name} atualizou a tarefa: ${changes.join(", ")}`);
      }

      toast({
        title: "Sucesso!",
        description: "Tarefa atualizada com sucesso.",
      });
      onUpdate();
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const handleComplete = async () => {
    // Verificação extra de segurança
    if (!canComplete) {
      toast({
        title: "Sem permissão",
        description: "Você só pode finalizar suas próprias tarefas.",
        variant: "destructive"
      });
      return;
    }

    setIsCompleting(true);
    try {
      await Task.update(task.id, {
        status: "Concluída",
        completed_date: format(new Date(), "yyyy-MM-dd")
      });

      await createTaskInteraction("completed", `${currentUser.full_name} finalizou a tarefa.`);
      await awardStarIfNeeded(task.id, task.protocol, task.department_id, false);

      // NOVO: Criar notificação para outros envolvidos
      // Get all users who interacted with this task
      const interactions = await TaskInteraction.filter({ task_id: task.id });
      const involvedUsers = new Set(interactions.map(i => i.user_email));
      involvedUsers.delete(currentUser.email); // Don't notify the person who completed it

      for (const userEmail of involvedUsers) {
        await createNotification(
          userEmail,
          "Tarefa Concluída",
          `A tarefa ${task.protocol} foi concluída por ${currentUser.full_name}`,
          "completed"
        );
      }

      toast({
        title: "Sucesso!",
        description: "Tarefa finalizada com sucesso.",
      });
      onUpdate();
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao finalizar tarefa.",
        variant: "destructive"
      });
    }
    setIsCompleting(false);
  };

  const handleTransfer = async () => {
    if (!transferToUser) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para transferir a tarefa.",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    try {
      await Task.update(task.id, {
        status: "Concluída",
        completed_date: format(new Date(), "yyyy-MM-dd")
      });

      const transferredToUser = users.find(u => u.email === transferToUser);
      const transferredToName = transferredToUser?.display_name || transferredToUser?.full_name || transferToUser;

      await createTaskInteraction(
        "transferred",
        `Tarefa transferida de ${currentUser.full_name} para ${transferredToName}`
      );

      // NOVO: Concede estrela ao usuário que está transferindo (passando que É transferência)
      await awardStarIfNeeded(task.id, task.protocol, task.department_id, true);

      const newTask = {
        protocol: task.protocol,
        description: task.description,
        end_date: task.end_date,
        priority: task.priority,
        assigned_to: transferToUser,
        department_id: task.department_id,
        status: "Pendente",
        created_date: format(new Date(), "yyyy-MM-dd")
      };

      const created = await Task.create(newTask);

      await TaskInteraction.create({
        task_id: created.id,
        interaction_type: "created",
        message: `Tarefa criada por transferência de ${currentUser.full_name} (Protocolo original: ${task.protocol})`,
        user_email: currentUser.email,
        user_name: currentUser.full_name
      });

      // NOVO: Criar notificação para o novo responsável
      await createNotification(
        transferToUser,
        "Nova Tarefa Atribuída",
        `A tarefa ${task.protocol} foi transferida para você por ${currentUser.full_name}`,
        "transferred"
      );

      toast({
        title: "Sucesso!",
        description: `Tarefa transferida para ${transferredToName} com sucesso.`,
      });
      
      onUpdate();
      setShowTransferDialog(false);
      onClose();
    } catch (error) {
      console.error("Erro ao transferir tarefa:", error);
      toast({
        title: "Erro",
        description: `Erro ao transferir tarefa. Detalhes: ${error.message || error}`,
        variant: "destructive"
      });
    }
    setIsTransferring(false);
  };

  const department = departments?.find(d => d.id === task.department_id);
  const assignedUser = users?.find(u => u.email === task.assigned_to);
  const assignedUserName = assignedUser?.display_name || assignedUser?.full_name || task.assigned_to;

  // Lista de usuários DISPONÍVEIS para transferência - TODOS MENOS O ATUAL
  const availableUsersForTransfer = users?.filter(u => u.email !== task.assigned_to) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                {isEditing ? "Editar Tarefa" : "Detalhes da Tarefa"}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Label>Protocolo</Label>
                {isEditing ? (
                  <Input
                    value={editedTask.protocol}
                    onChange={(e) => setEditedTask({...editedTask, protocol: e.target.value})}
                  />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{task.protocol}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                {isEditing ? (
                  <Select 
                    value={editedTask.priority} 
                    onValueChange={(value) => setEditedTask({...editedTask, priority: value})}
                  >
                    <SelectTrigger className="w-24">
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
                ) : (
                  <Badge className={`${priorityColors[task.priority]} border-0 font-semibold text-lg px-4 py-2`}>
                    {task.priority}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              {isEditing ? (
                <Textarea
                  value={editedTask.description}
                  onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 dark:text-[#a1a1a1] p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border dark:border-[#2e2e2e]">
                  {task.description || "Sem descrição"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Atribuído a
                </Label>
                {isEditing ? (
                  <Select 
                    value={editedTask.assigned_to} 
                    onValueChange={(value) => setEditedTask({...editedTask, assigned_to: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.display_name || user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-700 dark:text-[#a1a1a1] p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border dark:border-[#2e2e2e]">{assignedUserName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Departamento
                </Label>
                {isEditing ? (
                  <Select 
                    value={editedTask.department_id} 
                    onValueChange={(value) => setEditedTask({...editedTask, department_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-700 dark:text-[#a1a1a1] p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border dark:border-[#2e2e2e]">
                    {department?.name || "-"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Início
                </Label>
                <p className="text-gray-700 dark:text-[#a1a1a1] p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border dark:border-[#2e2e2e]">
                  {task.created_date ? format(parseDateAsLocal(task.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Término
                </Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedTask.end_date}
                    onChange={(e) => setEditedTask({...editedTask, end_date: e.target.value})}
                  />
                ) : (
                  <p className="text-gray-700 dark:text-[#a1a1a1] p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border dark:border-[#2e2e2e]">
                    {task.end_date ? format(parseDateAsLocal(task.end_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              {isEditing ? (
                <Select 
                  value={editedTask.status} 
                  onValueChange={(value) => setEditedTask({...editedTask, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Execução">Em Execução</SelectItem>
                    <SelectItem value="Atrasada">Atrasada</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${statusColors[task.status]} border-0 text-base px-4 py-2`}>
                  {task.status}
                </Badge>
              )}
            </div>

            {task.completed_date && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Data de Conclusão
                </Label>
                <p className="text-gray-700 dark:text-[#a1a1a1] p-3 bg-green-50 dark:bg-[#22946E]/20 rounded-lg border dark:border-[#22946E]/30">
                  {format(parseDateAsLocal(task.completed_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button 
              onClick={() => setShowInteractionsModal(true)}
              variant="outline"
              className="mr-auto gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Ver Interações
            </Button>
            
            {!isCompleted && !isEditing && (
              <>
                {canTransfer && (
                  <Button 
                    onClick={() => {
                      setShowTransferDialog(true);
                      setTransferToUser("");
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Transferir Tarefa
                  </Button>
                )}
                
                {canComplete && (
                  <Button 
                    onClick={handleComplete} 
                    disabled={isCompleting}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCompleting ? "Finalizando..." : "Finalizar Tarefa"}
                  </Button>
                )}
                
                {canEdit && (
                  <Button onClick={() => setIsEditing(true)} className="gap-2">
                    Editar
                  </Button>
                )}
              </>
            )}
            
            {isEditing && (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditedTask(task);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Transferência */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Protocolo</Label>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{task.protocol}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Transferir para</Label>
              <Select value={transferToUser} onValueChange={setTransferToUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsersForTransfer.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum usuário disponível</SelectItem>
                  ) : (
                    availableUsersForTransfer.map(user => {
                      const userName = user.display_name || user.full_name || user.email;
                      return (
                        <SelectItem key={user.id} value={user.email}>
                          {userName}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-[#21498A]/20 border border-blue-200 dark:border-[#21498A]/30 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Atenção:</strong> Ao transferir, a tarefa atual será marcada como concluída 
                e uma nova tarefa com o mesmo protocolo será criada para o usuário selecionado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={isTransferring || !transferToUser}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {isTransferring ? "Confirmando..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskInteractionsModal
        open={showInteractionsModal}
        onClose={() => setShowInteractionsModal(false)}
        task={task}
        currentUser={currentUser}
      />
    </>
  );
}