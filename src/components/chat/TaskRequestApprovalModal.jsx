import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, User, Calendar, ListChecks, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const TaskRequest = base44.entities.TaskRequest;
const Task = base44.entities.Task;
const Service = base44.entities.Service;
const TaskInteraction = base44.entities.TaskInteraction;
const ServiceInteraction = base44.entities.ServiceInteraction;

// --- Config ---
const CHUNK_SIZE = 5;
const MAX_RETRIES = 2;
const DELAY_BETWEEN_CHUNKS_MS = 200;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function processItemWithRetry(item, request, selectedDepartmentId, currentUser, retries = MAX_RETRIES) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (item.type === "task") {
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
      } else {
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
      return { status: "success", error: null };
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(300 * (attempt + 1));
    }
  }
  return { status: "failed", error: lastError?.message || "Erro desconhecido" };
}

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
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Processing state
  const [phase, setPhase] = useState("idle"); // idle | processing | done | rejecting
  const [itemLogs, setItemLogs] = useState([]); // {identifier, type, status, error}
  const [processedCount, setProcessedCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open && requestId) {
      loadRequest();
      setPhase("idle");
      setItemLogs([]);
      setProcessedCount(0);
      setShowDetails(false);
      cancelRef.current = false;
    }
  }, [open, requestId]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const requests = await TaskRequest.filter({ id: requestId });
      if (requests.length > 0) setRequest(requests[0]);
    } catch (error) {
      console.error("Erro ao carregar solicitação:", error);
    }
    setLoading(false);
  };

  const runBatch = async (itemsToProcess) => {
    const total = itemsToProcess.length;
    const logs = itemsToProcess.map(item => ({
      identifier: item.identifier,
      type: item.type,
      status: "pending",
      error: null,
      _item: item
    }));

    setItemLogs([...logs]);
    setProcessedCount(0);
    setPhase("processing");
    cancelRef.current = false;

    let done = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      if (cancelRef.current) break;

      const chunk = itemsToProcess.slice(i, i + CHUNK_SIZE);

      for (const item of chunk) {
        if (cancelRef.current) break;

        const idx = itemsToProcess.indexOf(item);
        // Mark as processing
        setItemLogs(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: "processing" };
          return next;
        });

        const result = await processItemWithRetry(item, request, selectedDepartmentId, currentUser);
        done++;

        setItemLogs(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: result.status, error: result.error };
          return next;
        });
        setProcessedCount(done);
      }

      if (i + CHUNK_SIZE < total && !cancelRef.current) {
        await sleep(DELAY_BETWEEN_CHUNKS_MS);
      }
    }

    return logs; // Return initial logs; caller uses itemLogs state
  };

  const handleApprove = async (failedItemsOnly = false) => {
    if (!request) return;

    const allItems = request.items || [];
    let itemsToProcess = allItems;

    if (failedItemsOnly) {
      const failedIds = itemLogs
        .filter(l => l.status === "failed")
        .map(l => l.identifier);
      itemsToProcess = allItems.filter(i => failedIds.includes(i.identifier));
    }

    await runBatch(itemsToProcess);

    // After batch, check results from state via callback
    setPhase("done");
  };

  // When phase becomes done, check if all succeeded to auto-update request
  useEffect(() => {
    if (phase !== "done") return;
    const failures = itemLogs.filter(l => l.status === "failed");
    const successes = itemLogs.filter(l => l.status === "success");

    if (failures.length === 0 && successes.length > 0) {
      // All succeeded - update request status
      TaskRequest.update(requestId, {
        status: "approved",
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString()
      }).then(() => {
        if (onApproved) onApproved(request, "approved");
      }).catch(console.error);
    }
  }, [phase]);

  const handleReject = async () => {
    if (!request) return;
    setPhase("rejecting");
    try {
      await TaskRequest.update(requestId, {
        status: "rejected",
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      });
      toast({ title: "Solicitação rejeitada", description: "O solicitante será notificado." });
      if (onApproved) onApproved(request, "rejected");
      handleClose();
    } catch (error) {
      toast({ title: "Erro ao rejeitar", description: error.message, variant: "destructive" });
    }
    setPhase("idle");
  };

  const handleClose = () => {
    if (phase === "processing") {
      cancelRef.current = true;
    }
    setRequest(null);
    setSelectedDepartmentId("");
    setRejectionReason("");
    setShowRejectForm(false);
    setPhase("idle");
    setItemLogs([]);
    setProcessedCount(0);
    onClose();
  };

  const isProcessing = phase === "processing";
  const isDone = phase === "done";

  const successCount = itemLogs.filter(l => l.status === "success").length;
  const failedCount = itemLogs.filter(l => l.status === "failed").length;
  const totalCount = itemLogs.length;
  const progressPct = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

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
          <div className="text-center py-8 text-gray-500">Solicitação não encontrada</div>
        </DialogContent>
      </Dialog>
    );
  }

  const items = request.items || [];
  const taskCount = items.filter(i => i.type === "task").length;
  const serviceCount = items.filter(i => i.type === "service").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-5 h-5 shrink-0" />
            Aprovar Solicitação de Tarefas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">

          {/* Info do solicitante */}
          <div className="bg-muted/50 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <User className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{request.requester_name}</p>
                <p className="text-xs text-muted-foreground truncate">{request.requester_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <Calendar className="w-4 h-4" />
              {format(new Date(request.created_date), "dd/MM/yyyy HH:mm")}
            </div>
          </div>

          {/* Resumo badges */}
          <div className="flex flex-wrap gap-2">
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

          {/* Departamento - só mostra se não estiver processando/feito */}
          {phase === "idle" && !showRejectForm && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Departamento (opcional)</label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lista de itens - só quando idle */}
          {phase === "idle" && !showRejectForm && (
            <ScrollArea className="border rounded-md max-h-[180px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Identificador</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Descrição</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={`text-xs ${item.type === 'task' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30"}`}>
                          {item.type === 'task' ? 'T' : 'S'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs py-1.5">{item.identifier}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1.5 truncate max-w-[130px] hidden sm:table-cell">{item.description || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5 hidden sm:table-cell">{item.end_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Progresso - durante processamento e após */}
          {(isProcessing || isDone) && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              {isProcessing && (
                <p className="text-sm font-medium text-center">
                  Processando {processedCount} de {totalCount}...
                </p>
              )}
              {isDone && (
                <p className="text-sm font-medium text-center flex items-center justify-center gap-2">
                  {failedCount === 0 ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Concluído com sucesso!</>
                  ) : (
                    <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Concluído com falhas</>
                  )}
                </p>
              )}

              <Progress value={isProcessing ? progressPct : 100} className="h-2" />

              <div className="flex justify-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> {successCount} sucesso
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" /> {totalCount - processedCount} pendente
                </span>
                {failedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="w-4 h-4" /> {failedCount} falha(s)
                  </span>
                )}
              </div>

              {/* Toggle detalhe */}
              <button
                className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground transition-colors"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Ocultar detalhes" : "Ver detalhes"}
              </button>

              {showDetails && (
                <ScrollArea className="max-h-[150px] border rounded-md bg-background">
                  <div className="p-2 space-y-1">
                    {itemLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        {log.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
                        {log.status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                        {log.status === "processing" && <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin mt-0.5 shrink-0" />}
                        {log.status === "pending" && <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />}
                        <span className="font-mono">{log.identifier}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {log.type === 'task' ? 'T' : 'S'}
                        </Badge>
                        {log.error && <span className="text-red-500 truncate">{log.error}</span>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

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

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          {/* Estado idle: botões normais */}
          {phase === "idle" && !showRejectForm && (
            <>
              <Button variant="outline" onClick={handleClose} className="sm:order-1">Cancelar</Button>
              <Button variant="destructive" onClick={() => setShowRejectForm(true)} className="sm:order-2">
                <XCircle className="w-4 h-4 mr-1.5" /> Rejeitar
              </Button>
              <Button onClick={() => handleApprove(false)} className="sm:order-3 gap-2">
                <CheckCircle2 className="w-4 h-4" /> Aprovar e Criar
              </Button>
            </>
          )}

          {/* Processando */}
          {phase === "processing" && (
            <>
              <Button variant="outline" onClick={() => { cancelRef.current = true; }} className="sm:order-1">
                Cancelar
              </Button>
              <Button disabled className="sm:order-2 gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Processando…
              </Button>
            </>
          )}

          {/* Concluído */}
          {phase === "done" && (
            <>
              {failedCount > 0 ? (
                <>
                  <Button variant="outline" onClick={handleClose} className="sm:order-1">Fechar</Button>
                  <Button variant="outline" onClick={() => handleApprove(true)} className="sm:order-2 gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                    <RefreshCw className="w-4 h-4" /> Tentar falhas ({failedCount})
                  </Button>
                  {successCount > 0 && (
                    <Button onClick={handleClose} className="sm:order-3">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar ({successCount} criados)
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={handleClose} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Fechar
                </Button>
              )}
            </>
          )}

          {/* Rejeição */}
          {showRejectForm && (
            <>
              <Button variant="outline" onClick={() => setShowRejectForm(false)} className="sm:order-1">Voltar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={phase === "rejecting"} className="sm:order-2">
                {phase === "rejecting" ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}