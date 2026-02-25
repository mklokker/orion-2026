import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Service } from "@/entities/Service";
import { UserStar } from "@/entities/UserStar"; // Added UserStar import
import { Save, X, Calendar, User as UserIcon, Building2, CheckCircle2, ArrowRight, MessageSquare, Star } from "lucide-react"; // Added Star icon import
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import ServiceInteractionsModal from "./ServiceInteractionsModal";
import { ServiceInteraction } from "@/entities/ServiceInteraction";

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
    return new Date(dateString);
  }
  const parts = dateString.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
};

export default function ServiceViewEditModal({ open, onClose, service, currentUser, users, departments, onUpdate }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedService, setEditedService] = useState(service);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferToUser, setTransferToUser] = useState("");
  const [showInteractionsModal, setShowInteractionsModal] = useState(false);

  useEffect(() => {
    setEditedService(service);
  }, [service]);

  // SIMPLIFICADO: Apenas verifica se está concluído
  const isCompleted = service.status === "Concluída";
  
  // NOVA LÓGICA: Verifica se o usuário pode finalizar
  const isAdmin = currentUser?.role === 'admin';
  const isMyService = service.assigned_to === currentUser?.email;
  const canComplete = !isCompleted && isMyService; // Só pode finalizar se for SEU serviço e não estiver concluído
  const canTransfer = !isCompleted; // Qualquer um pode transferir serviços não concluídos
  const canEdit = !isCompleted; // Qualquer um pode editar serviços não concluídos

  const createServiceInteraction = async (type, message, metadata = {}) => {
    try {
      await ServiceInteraction.create({
        service_id: service.id,
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
      // Busca a última estrela de conferência finalizada para este protocolo
      const conferenceStars = await UserStar.filter({
        protocol: protocol,
        item_type: "service"
      });
      
      // Filtra apenas as do departamento de conferência que foram finalizadas (não transferidas)
      // O cycle_id é gerado quando uma conferência é finalizada
      const cycles = conferenceStars
        .filter(s => s.cycle_id)
        .map(s => s.cycle_id)
        .sort()
        .reverse();
      
      // Se existe um ciclo, usa o mais recente, senão é o ciclo inicial "cycle_0"
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

  const awardStarIfNeeded = async (serviceId, serviceName, departmentId, isTransfer = false) => {
    try {
      const conferenceDeptId = getConferenceDeptId();
      const isConference = departmentId === conferenceDeptId;
      
      // Busca o ciclo atual
      let currentCycleId = await getCurrentCycleId(serviceName);
      
      // Se é conferência e NÃO é transferência, cria um novo ciclo
      if (isConference && !isTransfer) {
        currentCycleId = `cycle_${Date.now()}`;
      }
      
      // Verifica se o usuário já tem estrela para este serviço NESTE DEPARTAMENTO e NESTE CICLO
      const existingStars = await UserStar.filter({
        user_email: currentUser.email,
        protocol: serviceName,
        item_type: "service",
        department_id: departmentId,
        cycle_id: currentCycleId
      });

      if (existingStars.length === 0) {
        // Usuário ainda não tem estrela para este serviço neste departamento/ciclo
        await UserStar.create({
          user_email: currentUser.email,
          protocol: serviceName,
          item_type: "service",
          earned_date: format(new Date(), "yyyy-MM-dd"),
          completed_item_id: serviceId,
          department_id: departmentId,
          cycle_id: currentCycleId
        });

        const dept = departments?.find(d => d.id === departmentId);
        toast({
          title: "⭐ Estrela Conquistada!",
          description: `Você ganhou 1 estrela em ${dept?.name || 'Departamento'} ao concluir o serviço "${serviceName}"!`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Erro ao verificar/criar estrela:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = [];
      if (editedService.service_name !== service.service_name) changes.push(`Nome: ${service.service_name} → ${editedService.service_name}`);
      if (editedService.description !== service.description) changes.push(`Descrição alterada`);
      if (editedService.status !== service.status) changes.push(`Status: ${service.status} → ${editedService.status}`);
      if (editedService.priority !== service.priority) changes.push(`Prioridade: ${service.priority} → ${editedService.priority}`);
      if (editedService.assigned_to !== service.assigned_to) changes.push(`Responsável: ${service.assigned_to} → ${editedService.assigned_to}`);
      if (editedService.end_date !== service.end_date) changes.push(`Data de Término: ${service.end_date} → ${editedService.end_date}`);

      await Service.update(service.id, editedService);

      if (changes.length > 0) {
        await createServiceInteraction("updated", `${currentUser.full_name} atualizou o serviço: ${changes.join(", ")}`);
      }

      toast({
        title: "Sucesso!",
        description: "Serviço atualizado com sucesso.",
      });
      onUpdate();
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar serviço.",
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
        description: "Você só pode finalizar seus próprios serviços.",
        variant: "destructive"
      });
      return;
    }

    setIsCompleting(true);
    try {
      await Service.update(service.id, {
        status: "Concluída",
        completed_date: format(new Date(), "yyyy-MM-dd")
      });

      await createServiceInteraction("completed", `${currentUser.full_name} finalizou o serviço.`);

      // NOVO: Concede estrela se necessário (passando departamento e que NÃO é transferência)
      await awardStarIfNeeded(service.id, service.service_name, service.department_id, false);

      toast({
        title: "Sucesso!",
        description: "Serviço finalizado com sucesso.",
      });
      onUpdate();
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao finalizar serviço.",
        variant: "destructive"
      });
    }
    setIsCompleting(false);
  };

  const handleTransfer = async () => {
    if (!transferToUser) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para transferir o serviço.",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    try {
      await Service.update(service.id, {
        status: "Concluída",
        completed_date: format(new Date(), "yyyy-MM-dd")
      });

      const transferredToUser = users.find(u => u.email === transferToUser);
      const transferredToName = transferredToUser?.display_name || transferredToUser?.full_name || transferToUser;

      await createServiceInteraction(
        "transferred",
        `Serviço transferido de ${currentUser.full_name} para ${transferredToName}`
      );

      // NOVO: Concede estrela ao usuário que está transferindo (passando que É transferência)
      await awardStarIfNeeded(service.id, service.service_name, service.department_id, true);

      const newService = {
        service_name: service.service_name,
        description: service.description,
        end_date: service.end_date,
        priority: service.priority,
        assigned_to: transferToUser,
        department_id: service.department_id,
        status: "Pendente"
      };

      const created = await Service.create(newService);

      await ServiceInteraction.create({
        service_id: created.id,
        interaction_type: "created",
        message: `Serviço criado por transferência de ${currentUser.full_name} (Serviço original: ${service.service_name})`,
        user_email: currentUser.email,
        user_name: currentUser.full_name
      });

      toast({
        title: "Sucesso!",
        description: `Serviço transferido para ${transferredToName} com sucesso.`,
      });
      
      onUpdate();
      setShowTransferDialog(false);
      onClose();
    } catch (error) {
      console.error("Erro ao transferir serviço:", error);
      toast({
        title: "Erro",
        description: `Erro ao transferir serviço. Detalhes: ${error.message || error}`,
        variant: "destructive"
      });
    }
    setIsTransferring(false);
  };

  const department = departments?.find(d => d.id === service.department_id);
  const assignedUser = users?.find(u => u.email === service.assigned_to);
  const assignedUserName = assignedUser?.display_name || assignedUser?.full_name || service.assigned_to;

  // Lista de usuários DISPONÍVEIS para transferência - TODOS MENOS O ATUAL
  const availableUsersForTransfer = users?.filter(u => u.email !== service.assigned_to) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                {isEditing ? "Editar Serviço" : "Detalhes do Serviço"}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Label>Nome do Serviço</Label>
                {isEditing ? (
                  <Input
                    value={editedService.service_name}
                    onChange={(e) => setEditedService({...editedService, service_name: e.target.value})}
                  />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{service.service_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                {isEditing ? (
                  <Select 
                    value={editedService.priority} 
                    onValueChange={(value) => setEditedService({...editedService, priority: value})}
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
                  <Badge className={`${priorityColors[service.priority]} border-0 font-semibold text-lg px-4 py-2`}>
                    {service.priority}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              {isEditing ? (
                <Textarea
                  value={editedService.description}
                  onChange={(e) => setEditedService({...editedService, description: e.target.value})}
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                  {service.description || "Sem descrição"}
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
                    value={editedService.assigned_to} 
                    onValueChange={(value) => setEditedService({...editedService, assigned_to: value})}
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
                  <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">{assignedUserName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Departamento
                </Label>
                {isEditing ? (
                  <Select 
                    value={editedService.department_id} 
                    onValueChange={(value) => setEditedService({...editedService, department_id: value})}
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
                  <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                    {department?.name || "-"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Início
                </Label>
                <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                  {service.created_date ? format(parseDateAsLocal(service.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
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
                    value={editedService.end_date}
                    onChange={(e) => setEditedService({...editedService, end_date: e.target.value})}
                  />
                ) : (
                  <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
                    {service.end_date ? format(parseDateAsLocal(service.end_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              {isEditing ? (
                <Select 
                  value={editedService.status} 
                  onValueChange={(value) => setEditedService({...editedService, status: value})}
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
                <Badge className={`${statusColors[service.status]} border-0 text-base px-4 py-2`}>
                  {service.status}
                </Badge>
              )}
            </div>

            {service.completed_date && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Data de Conclusão
                </Label>
                <p className="text-gray-700 p-3 bg-green-50 rounded-lg">
                  {format(parseDateAsLocal(service.completed_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button 
              onClick={() => setShowInteractionsModal(true)}
              variant="outline"
              className="gap-2 mr-auto"
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
                    Transferir Serviço
                  </Button>
                )}
                
                {canComplete && (
                  <Button 
                    onClick={handleComplete} 
                    disabled={isCompleting}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCompleting ? "Finalizando..." : "Finalizar Serviço"}
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
                  setEditedService(service);
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
            <DialogTitle>Transferir Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Serviço</Label>
              <p className="text-2xl font-bold text-gray-900">{service.service_name}</p>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Atenção:</strong> Ao transferir, o serviço atual será marcado como concluído 
                e um novo serviço com o mesmo nome será criado para o usuário selecionado.
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

      <ServiceInteractionsModal
        open={showInteractionsModal}
        onClose={() => setShowInteractionsModal(false)}
        service={service}
        currentUser={currentUser}
      />
    </>
  );
}