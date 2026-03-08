import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, User, Calendar, ListChecks, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, SkipForward } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { approveRequestWithValidation } from "./approvalUtils";

const TaskRequest = base44.entities.TaskRequest;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Status icon per item result ────────────────────────────────────────────
function ItemStatusIcon({ status }) {
  if (status === "created")        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />;
  if (status === "skipped_active") return <SkipForward  className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />;
  if (status === "failed")         return <XCircle      className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />;
  if (status === "processing")     return <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 mt-0.5" />;
  return <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />;
}

export default function TaskRequestApprovalModal({
  open,
  onClose,
  requestId,
  currentUser,
  departments = [],
  onApproved,
}) {
  const { toast } = useToast();
  const [request, setRequest]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm]   = useState(false);

  // Processing state
  const [phase, setPhase]               = useState("idle"); // idle | processing | done | rejecting
  const [itemLogs, setItemLogs]         = useState([]);     // result per item
  const [processedCount, setProcessedCount] = useState(0);
  const [showDetails, setShowDetails]   = useState(false);
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
      const all = await TaskRequest.list();
      const found = all.find(r => r.id === requestId);
      if (found) setRequest(found);
    } catch (e) {
      console.error("Erro ao carregar solicitação:", e);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!request) return;
    const items = request.items || [];
    if (items.length === 0) return;

    cancelRef.current = false;
    setPhase("processing");
    setShowDetails(false);

    // Init placeholder logs
    const placeholders = items.map(item => ({
      identifier: item.identifier,
      type:       item.type,
      status:     "pending",
      reason:     null,
    }));
    setItemLogs(placeholders);
    setProcessedCount(0);

    try {
      await approveRequestWithValidation(
        request,
        selectedDepartmentId,
        currentUser,
        (result, doneCount) => {
          if (cancelRef.current) return;
          setItemLogs(prev => {
            const next = [...prev];
            const idx = next.findIndex(l => l.identifier === result.identifier && l.type === result.type);
            if (idx >= 0) next[idx] = result;
            return next;
          });
          setProcessedCount(doneCount);
        }
      );
    } catch (err) {
      console.error("Erro ao aprovar:", err);
      toast({ title: "Erro na aprovação", description: err.message, variant: "destructive" });
    }

    setPhase("done");
    if (onApproved) onApproved(request, "approved");
  };

  const handleReject = async () => {
    if (!request) return;
    setPhase("rejecting");
    try {
      await TaskRequest.update(requestId, {
        status:           "rejected",
        reviewed_by:      currentUser.email,
        reviewed_at:      new Date().toISOString(),
        rejection_reason: rejectionReason,
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
    if (phase === "processing") cancelRef.current = true;
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
  const isDone       = phase === "done";

  const createdCount  = itemLogs.filter(l => l.status === "created").length;
  const skippedCount  = itemLogs.filter(l => l.status === "skipped_active").length;
  const failedCount   = itemLogs.filter(l => l.status === "failed").length;
  const totalCount    = itemLogs.length;
  const progressPct   = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!request) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="text-center py-8 text-muted-foreground">Solicitação não encontrada</div>
        </DialogContent>
      </Dialog>
    );
  }

  const items        = request.items || [];
  const taskCount    = items.filter(i => i.type === "task").length;
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

          {/* Solicitante */}
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

          {/* Badges */}
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

          {/* Departamento */}
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

          {/* Lista de itens — só quando idle */}
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
                        <Badge variant="outline" className={`text-xs ${item.type === "task" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30"}`}>
                          {item.type === "task" ? "T" : "S"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs py-1.5">{item.identifier}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1.5 truncate max-w-[130px] hidden sm:table-cell">{item.description || "—"}</TableCell>
                      <TableCell className="text-xs py-1.5 hidden sm:table-cell">{item.end_date || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Progresso + resultado */}
          {(isProcessing || isDone) && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              {isProcessing && (
                <p className="text-sm font-medium text-center">
                  Validando e processando {processedCount} de {totalCount}…
                </p>
              )}
              {isDone && (
                <p className="text-sm font-medium text-center flex items-center justify-center gap-2">
                  {failedCount === 0 ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Processamento concluído!</>
                  ) : (
                    <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Concluído com {failedCount} falha(s)</>
                  )}
                </p>
              )}

              <Progress value={isProcessing ? progressPct : 100} className="h-2" />

              {/* Contadores */}
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> {createdCount} criado(s)
                </span>
                {skippedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                    <SkipForward className="w-4 h-4" /> {skippedCount} pulado(s) — já ativo(s)
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="w-4 h-4" /> {failedCount} falha(s)
                  </span>
                )}
                {isProcessing && totalCount - processedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4" /> {totalCount - processedCount} pendente(s)
                  </span>
                )}
              </div>

              {/* Toggle detalhes */}
              <button
                className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground transition-colors py-1"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Ocultar detalhes" : "Ver detalhes por item"}
              </button>

              {showDetails && (
                <ScrollArea className="max-h-[160px] border rounded-md bg-background">
                  <div className="p-2 space-y-1.5">
                    {itemLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <ItemStatusIcon status={log.status} />
                        <span className="font-mono shrink-0">{log.identifier}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                          {log.type === "task" ? "T" : "S"}
                        </Badge>
                        {log.status === "skipped_active" && (
                          <span className="text-yellow-600 dark:text-yellow-400 truncate">{log.reason}</span>
                        )}
                        {log.status === "failed" && (
                          <span className="text-red-500 truncate">{log.reason}</span>
                        )}
                        {log.status === "created" && (
                          <span className="text-green-600 dark:text-green-400">criado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Aviso se todos pulados */}
              {isDone && createdCount === 0 && skippedCount > 0 && failedCount === 0 && (
                <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Nenhum item novo criado — todos os itens solicitados já existem e estão ativos no sistema.</span>
                </div>
              )}
            </div>
          )}

          {/* Form de rejeição */}
          {showRejectForm && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da rejeição</label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Informe o motivo da rejeição (opcional)..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          {phase === "idle" && !showRejectForm && (
            <>
              <Button variant="outline" onClick={handleClose} className="sm:order-1">Cancelar</Button>
              <Button variant="destructive" onClick={() => setShowRejectForm(true)} className="sm:order-2">
                <XCircle className="w-4 h-4 mr-1.5" /> Rejeitar
              </Button>
              <Button onClick={handleApprove} className="sm:order-3 gap-2">
                <CheckCircle2 className="w-4 h-4" /> Aprovar e Criar
              </Button>
            </>
          )}

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

          {phase === "done" && (
            <Button onClick={handleClose} className="gap-2 w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4" />
              Fechar
              {createdCount > 0 && ` (${createdCount} criado${createdCount > 1 ? "s" : ""})`}
            </Button>
          )}

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