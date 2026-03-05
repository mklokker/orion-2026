import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, User, Calendar, ListChecks } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const TaskRequest = base44.entities.TaskRequest;
const Task = base44.entities.Task;
const Service = base44.entities.Service;
const TaskInteraction = base44.entities.TaskInteraction;
const ServiceInteraction = base44.entities.ServiceInteraction;

export default function TaskRequestApprovalModal({ 
  open, 
  onClose, 
  requestId,
  currentUser,
  departments = [],
  onApproved 
}) {
  const { toast } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (open && requestId) {
      loadRequest();
    }
  }, [open, requestId]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const requests = await TaskRequest.filter({ id: requestId });
      if (requests.length > 0) {
        setRequest(requests[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitação:", error);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!request) return;
    
    setProcessing(true);
    try {
      const items = request.items || [];
      const tasksToCreate = items.filter(i => i.type === "task");
      const servicesToCreate = items.filter(i => i.type === "service");

      // Criar tarefas
      for (const item of tasksToCreate) {
        const task = await Task.create({
          protocol: item.identifier,
          description: item.description || `Tarefa ${item.identifier}`,
          end_date: item.end_date,
          priority: "P3",
          assigned_to: request.requester_email,
          department_id: selectedDepartmentId || undefined,
          status: "Pendente"
        });

        await TaskInteraction.create({
          task_id: task.id,
          interaction_type: "created",
          message: `Tarefa criada via solicitação no chat por ${currentUser.full_name || currentUser.email}`,
          user_email: currentUser.email,
          user_name: currentUser.full_name || currentUser.email
        });
      }

      // Criar serviços
      for (const item of servicesToCreate) {
        const service = await Service.create({
          service_name: item.identifier,
          description: item.description || `Serviço ${item.identifier}`,
          end_date: item.end_date,
          priority: "P3",
          assigned_to: request.requester_email,
          department_id: selectedDepartmentId || undefined,
          status: "Em Execução"
        });

        await ServiceInteraction.create({
          service_id: service.id,
          interaction_type: "created",
          message: `Serviço criado via solicitação no chat por ${currentUser.full_name || currentUser.email}`,
          user_email: currentUser.email,
          user_name: currentUser.full_name || currentUser.email
        });
      }

      // Atualizar status da solicitação
      await TaskRequest.update(requestId, {
        status: "approved",
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString()
      });

      toast({
        title: "Solicitação aprovada!",
        description: `${tasksToCreate.length} tarefa(s) e ${servicesToCreate.length} serviço(s) criado(s).`
      });

      if (onApproved) {
        onApproved(request, "approved");
      }

      handleClose();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!request) return;
    
    setProcessing(true);
    try {
      await TaskRequest.update(requestId, {
        status: "rejected",
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      });

      toast({
        title: "Solicitação rejeitada",
        description: "O solicitante será notificado."
      });

      if (onApproved) {
        onApproved(request, "rejected");
      }

      handleClose();
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
      toast({ title: "Erro ao rejeitar", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleClose = () => {
    setRequest(null);
    setSelectedDepartmentId("");
    setRejectionReason("");
    setShowRejectForm(false);
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!request) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="text-center py-8 text-gray-500">
            Solicitação não encontrada
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const items = request.items || [];
  const taskCount = items.filter(i => i.type === "task").length;
  const serviceCount = items.filter(i => i.type === "service").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Aprovar Solicitação de Tarefas
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Info do solicitante */}
          <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">{request.requester_name}</p>
                <p className="text-xs text-gray-500">{request.requester_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-4 h-4" />
              {format(new Date(request.created_date), "dd/MM/yyyy HH:mm")}
            </div>
          </div>

          {/* Resumo */}
          <div className="flex gap-2">
            {taskCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {taskCount} Tarefa(s)
              </Badge>
            )}
            {serviceCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                {serviceCount} Serviço(s)
              </Badge>
            )}
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Departamento (opcional)</label>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um departamento..." />
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

          {/* Lista de itens */}
          <ScrollArea className="flex-1 border rounded-md max-h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline" className={item.type === 'task' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}>
                        {item.type === 'task' ? 'Tarefa' : 'Serviço'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
                    <TableCell className="text-xs text-gray-500 truncate max-w-[150px]">{item.description || "-"}</TableCell>
                    <TableCell className="text-xs">{item.end_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Form de rejeição */}
          {showRejectForm && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da rejeição</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Informe o motivo da rejeição (opcional)..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showRejectForm ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={processing}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {processing ? "Criando..." : "Aprovar e Criar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>Voltar</Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}