import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, Clock, ListChecks, AlertTriangle,
  ChevronDown, ChevronUp, SkipForward, Users
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { approveRequestWithValidation, buildExistingMaps, processItemWithValidation } from "./approvalUtils";

const TaskRequest = base44.entities.TaskRequest;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function ItemStatusIcon({ status }) {
  if (status === "created")        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />;
  if (status === "skipped_active") return <SkipForward  className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />;
  if (status === "failed")         return <XCircle      className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />;
  if (status === "processing")     return <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 mt-0.5" />;
  return <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />;
}

/**
 * Modal de aprovação em lote a partir de mensagens selecionadas no chat.
 * Recebe taskRequestIds (array de IDs de TaskRequest) e processa todos os itens juntos.
 */
export default function BatchApprovalFromSelectionModal({
  open,
  onClose,
  taskRequestIds = [],  // IDs das TaskRequests selecionadas
  currentUser,
  departments = [],
  onApproved,
}) {
  const { toast } = useToast();
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [phase, setPhase]               = useState("idle");
  const [itemLogs, setItemLogs]         = useState([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [showDetails, setShowDetails]   = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (open && taskRequestIds.length > 0) {
      loadRequests();
      setPhase("idle");
      setItemLogs([]);
      setProcessedCount(0);
      setShowDetails(false);
      setSelectedDepartmentId("");
      cancelRef.current = false;
    }
  }, [open, taskRequestIds.join(",")]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const all = await TaskRequest.list();
      const found = all.filter(r => taskRequestIds.includes(r.id) && r.status === "pending");
      setRequests(found);
    } catch (e) {
      console.error("Erro ao carregar solicitações:", e);
    }
    setLoading(false);
  };

  // Junta todos os itens de todas as requests
  const allItems = requests.flatMap(r =>
    (r.items || []).map(item => ({ ...item, _requestId: r.id, _requester: r.requester_name || r.requester_email }))
  );

  const taskCount    = allItems.filter(i => i.type === "task").length;
  const serviceCount = allItems.filter(i => i.type === "service").length;

  const handleApprove = async () => {
    if (!requests.length || !allItems.length) return;
    cancelRef.current = false;
    setPhase("processing");
    setShowDetails(false);

    // Init placeholder logs
    const placeholders = allItems.map(item => ({
      identifier: item.identifier,
      type:       item.type,
      requester:  item._requester,
      status:     "pending",
      reason:     null,
    }));
    setItemLogs(placeholders);
    setProcessedCount(0);

    try {
      // Build existence maps once for all items
      const { taskMap, serviceMap } = await buildExistingMaps(allItems);
      let doneCount = 0;

      // Process each request's items, grouped by request
      for (const req of requests) {
        if (cancelRef.current) break;
        const reqItems = (req.items || []).map(i => ({ ...i, _requestId: req.id, _requester: req.requester_name }));

        const reqResults = [];
        for (const item of reqItems) {
          if (cancelRef.current) break;
          const result = await processItemWithValidation(item, req, selectedDepartmentId, currentUser, taskMap, serviceMap);
          reqResults.push(result);
          doneCount++;

          if (!cancelRef.current) {
            setItemLogs(prev => {
              const next = [...prev];
              // Match by identifier + type + requestId
              const idx = next.findIndex(l =>
                l.identifier === item.identifier && l.type === item.type && l.requester === item._requester
              );
              if (idx >= 0) next[idx] = { ...result, requester: item._requester };
              return next;
            });
            setProcessedCount(doneCount);
          }
        }

        // Mark this request as approved with its results
        if (!cancelRef.current) {
          try {
            await approveRequestWithValidation.__updateRequest?.(req.id, reqResults, currentUser);
          } catch (_) {}
          // Direct update fallback
          try {
            const approvalResult = {
              items: reqResults,
              summary: {
                total: reqResults.length,
                created: reqResults.filter(r => r.status === "created").length,
                skipped_active: reqResults.filter(r => r.status === "skipped_active").length,
                failed: reqResults.filter(r => r.status === "failed").length,
              },
              processed_at: new Date().toISOString(),
            };
            const approverName = currentUser.display_name || currentUser.full_name || currentUser.email;
            await TaskRequest.update(req.id, {
              status: "approved",
              reviewed_by: currentUser.email,
              reviewed_at: new Date().toISOString(),
              approval_result: approvalResult,
            });

            // Post confirmation message in conversation
            if (req.conversation_id) {
              const ChatMessage = base44.entities.ChatMessage;
              const ChatConversation = base44.entities.ChatConversation;
              const s = approvalResult.summary;
              let msg = `✅ **Solicitação aprovada em lote** por ${approverName}\n\n`;
              if (s.created > 0)        msg += `✅ Criados: ${s.created}\n`;
              if (s.skipped_active > 0) msg += `⏭️ Pulados (já ativos): ${s.skipped_active}\n`;
              if (s.failed > 0)         msg += `❌ Falhas: ${s.failed}\n`;
              await ChatMessage.create({
                conversation_id: req.conversation_id,
                sender_email: currentUser.email,
                sender_name: approverName,
                content: msg,
                type: "text",
                read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }],
              }).catch(() => {});
              await ChatConversation.update(req.conversation_id, {
                last_message: `✅ Solicitação aprovada em lote por ${approverName}`,
                last_message_at: new Date().toISOString(),
                last_message_by: currentUser.email,
              }).catch(() => {});
            }
          } catch (err) {
            console.error("Erro ao marcar request como aprovada:", err);
          }
        }
      }
    } catch (err) {
      console.error("Erro no processamento em lote:", err);
      toast({ title: "Erro na aprovação em lote", description: err.message, variant: "destructive" });
    }

    setPhase("done");
    if (onApproved) onApproved();
  };

  const handleClose = () => {
    if (phase === "processing") cancelRef.current = true;
    setRequests([]);
    setItemLogs([]);
    setProcessedCount(0);
    setPhase("idle");
    onClose();
  };

  const isProcessing = phase === "processing";
  const isDone       = phase === "done";

  const createdCount  = itemLogs.filter(l => l.status === "created").length;
  const skippedCount  = itemLogs.filter(l => l.status === "skipped_active").length;
  const failedCount   = itemLogs.filter(l => l.status === "failed").length;
  const totalCount    = itemLogs.length;
  const progressPct   = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-5 h-5 shrink-0 text-amber-600" />
            Aprovação em Lote — {requests.length} solicitação{requests.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma solicitação pendente encontrada nas mensagens selecionadas.
            </div>
          ) : (
            <>
              {/* Resumo de solicitações */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  Solicitantes:
                </div>
                <div className="flex flex-wrap gap-2">
                  {requests.map(r => (
                    <Badge key={r.id} variant="outline" className="text-xs">
                      {r.requester_name || r.requester_email}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Badges de total */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {allItems.length} item(s) no total
                </Badge>
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

              {/* Departamento — só no idle */}
              {phase === "idle" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Departamento (opcional — aplica a todos)</label>
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

              {/* Lista de itens — só no idle */}
              {phase === "idle" && (
                <ScrollArea className="border rounded-md max-h-[200px]">
                  <div className="p-2 space-y-1">
                    {requests.map(req => (
                      <div key={req.id}>
                        <div className="text-xs font-semibold text-muted-foreground px-1 py-1 border-b mb-1">
                          {req.requester_name || req.requester_email} — {(req.items || []).length} item(s)
                        </div>
                        {(req.items || []).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-1 py-1 text-xs">
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 shrink-0 ${item.type === "task" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                              {item.type === "task" ? "T" : "S"}
                            </Badge>
                            <span className="font-mono truncate">{item.identifier}</span>
                            {item.end_date && <span className="text-muted-foreground shrink-0">{item.end_date}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Progresso */}
              {(isProcessing || isDone) && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  {isProcessing && (
                    <p className="text-sm font-medium text-center">
                      Processando {processedCount} de {totalCount} itens…
                    </p>
                  )}
                  {isDone && (
                    <p className="text-sm font-medium text-center flex items-center justify-center gap-2">
                      {failedCount === 0 ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-500" /> Aprovação em lote concluída!</>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Concluído com {failedCount} falha(s)</>
                      )}
                    </p>
                  )}

                  <Progress value={isProcessing ? progressPct : 100} className="h-2" />

                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> {createdCount} criado(s)
                    </span>
                    {skippedCount > 0 && (
                      <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                        <SkipForward className="w-4 h-4" /> {skippedCount} pulado(s)
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
                            <span className="text-muted-foreground truncate">{log.requester}</span>
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
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          {phase === "idle" && (
            <>
              <Button variant="outline" onClick={handleClose} className="sm:order-1 w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading || requests.length === 0}
                className="sm:order-2 gap-2 w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprovar {allItems.length} item{allItems.length !== 1 ? "s" : ""} em lote
              </Button>
            </>
          )}
          {isProcessing && (
            <Button variant="outline" onClick={() => { cancelRef.current = true; }} className="w-full sm:w-auto">
              Cancelar
            </Button>
          )}
          {isDone && (
            <Button onClick={handleClose} className="gap-2 w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4" />
              Fechar {createdCount > 0 && `(${createdCount} criado${createdCount > 1 ? "s" : ""})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}