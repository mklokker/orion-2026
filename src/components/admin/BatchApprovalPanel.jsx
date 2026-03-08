import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw,
  ListChecks, ChevronDown, ChevronUp, User, Calendar, Layers
} from "lucide-react";
import { format } from "date-fns";

const TaskRequest = base44.entities.TaskRequest;
const Task = base44.entities.Task;
const Service = base44.entities.Service;
const TaskInteraction = base44.entities.TaskInteraction;
const ServiceInteraction = base44.entities.ServiceInteraction;
const ChatMessage = base44.entities.ChatMessage;
const ChatConversation = base44.entities.ChatConversation;

const CHUNK_SIZE = 8;
const DELAY_MS = 150;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Process a single TaskRequest (approve all items) ──────────────────────────
async function approveRequest(request, departmentId, currentUser) {
  const items = request.items || [];
  let created = 0;
  const errors = [];

  for (const item of items) {
    try {
      if (item.type === "task") {
        const task = await Task.create({
          protocol: item.identifier,
          description: item.description || `Tarefa ${item.identifier}`,
          end_date: item.end_date,
          priority: "P3",
          assigned_to: request.requester_email,
          department_id: departmentId || undefined,
          status: "Pendente",
        });
        await TaskInteraction.create({
          task_id: task.id,
          interaction_type: "created",
          message: `Tarefa criada via aprovação em lote por ${currentUser.display_name || currentUser.full_name || currentUser.email}`,
          user_email: currentUser.email,
          user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
        });
      } else {
        const svc = await Service.create({
          service_name: item.identifier,
          description: item.description || `Serviço ${item.identifier}`,
          end_date: item.end_date,
          priority: "P3",
          assigned_to: request.requester_email,
          department_id: departmentId || undefined,
          status: "Em Execução",
        });
        await ServiceInteraction.create({
          service_id: svc.id,
          interaction_type: "created",
          message: `Serviço criado via aprovação em lote por ${currentUser.display_name || currentUser.full_name || currentUser.email}`,
          user_email: currentUser.email,
          user_name: currentUser.display_name || currentUser.full_name || currentUser.email,
        });
      }
      created++;
    } catch (err) {
      errors.push(`${item.identifier}: ${err.message || "erro"}`);
    }
  }

  // Update request status
  await TaskRequest.update(request.id, {
    status: "approved",
    reviewed_by: currentUser.email,
    reviewed_at: new Date().toISOString(),
  });

  // Post chat message if conversation exists
  if (request.conversation_id) {
    try {
      const approverName = currentUser.display_name || currentUser.full_name || currentUser.email;
      const taskItems = items.filter(i => i.type === "task");
      const svcItems = items.filter(i => i.type === "service");
      let summary = `✅ **Solicitação aprovada** por ${approverName}\n\n`;
      if (taskItems.length) summary += `📋 **${taskItems.length} Tarefa(s)** criada(s)\n`;
      if (svcItems.length) summary += `🔧 **${svcItems.length} Serviço(s)** criado(s)\n`;
      if (errors.length) summary += `\n⚠️ ${errors.length} item(s) com erro.`;

      await ChatMessage.create({
        conversation_id: request.conversation_id,
        sender_email: currentUser.email,
        sender_name: approverName,
        content: summary,
        type: "text",
        read_by: [{ email: currentUser.email, read_at: new Date().toISOString() }],
      });

      await ChatConversation.update(request.conversation_id, {
        last_message: `✅ Solicitação aprovada por ${approverName}`,
        last_message_at: new Date().toISOString(),
        last_message_by: currentUser.email,
      });
    } catch (_) { /* silent – chat notification is non-critical */ }
  }

  return { created, errors };
}

// ── Result badge per item ────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === "success")     return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "skipped")     return <Clock className="w-4 h-4 text-yellow-500 shrink-0" />;
  if (status === "failed")      return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === "processing")  return <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />;
  return <Clock className="w-4 h-4 text-muted-foreground shrink-0" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BatchApprovalPanel({ currentUser, departments = [] }) {
  const { toast } = useToast();

  // Data
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selected, setSelected] = useState(new Set());
  const [departmentId, setDepartmentId] = useState("");

  // Processing
  const [phase, setPhase] = useState("idle"); // idle | processing | done
  const [logs, setLogs] = useState([]); // { id, requester, itemCount, status, error }
  const [processed, setProcessed] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await TaskRequest.filter({ status: "pending" }, "-created_date", 100);
      setPending(all);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allIds = pending.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Batch approve ──────────────────────────────────────────────────────────
  const handleBatchApprove = async () => {
    if (!someSelected) return;

    const toProcess = pending.filter(r => selected.has(r.id));
    const total = toProcess.length;
    cancelRef.current = false;

    const initLogs = toProcess.map(r => ({
      id: r.id,
      requester: r.requester_name || r.requester_email,
      itemCount: (r.items || []).length,
      status: "pending",
      error: null,
      _request: r,
    }));

    setLogs(initLogs);
    setProcessed(0);
    setPhase("processing");
    setShowDetails(false);

    let done = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      if (cancelRef.current) break;
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);

      for (const req of chunk) {
        if (cancelRef.current) break;
        const idx = toProcess.indexOf(req);

        // Validate: still pending?
        let freshStatus = "pending";
        try {
          const fresh = await TaskRequest.filter({ id: req.id });
          freshStatus = fresh[0]?.status || "pending";
        } catch (_) {}

        if (freshStatus !== "pending") {
          // Skip — already processed
          setLogs(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], status: "skipped", error: "Já processada anteriormente" };
            return next;
          });
          done++;
          setProcessed(done);
          continue;
        }

        // Mark as processing
        setLogs(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: "processing" };
          return next;
        });

        try {
          await approveRequest(req, departmentId, currentUser);
          setLogs(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], status: "success" };
            return next;
          });
        } catch (err) {
          setLogs(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], status: "failed", error: err.message || "Erro desconhecido" };
            return next;
          });
        }

        done++;
        setProcessed(done);
      }

      if (i + CHUNK_SIZE < total && !cancelRef.current) await sleep(DELAY_MS);
    }

    setPhase("done");
    // Remove approved from list
    await load();
    setSelected(new Set());
  };

  // ── Derived counters ───────────────────────────────────────────────────────
  const total = logs.length;
  const successCount  = logs.filter(l => l.status === "success").length;
  const skippedCount  = logs.filter(l => l.status === "skipped").length;
  const failedCount   = logs.filter(l => l.status === "failed").length;
  const progressPct   = total > 0 ? Math.round((processed / total) * 100) : 0;

  const isProcessing = phase === "processing";
  const isDone       = phase === "done";

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Aprovação em Lote
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Carregando..." : `${pending.length} solicitação(ões) pendente(s)`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={isProcessing} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
          {someSelected && !isProcessing && (
            <Button size="sm" onClick={handleBatchApprove} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aprovar {selected.size} selecionado(s)
            </Button>
          )}
          {isProcessing && (
            <Button size="sm" variant="outline" onClick={() => { cancelRef.current = true; }}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Department selector */}
      {!isProcessing && !isDone && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <span className="text-sm font-medium shrink-0">Departamento (opcional):</span>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Sem departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Sem departamento</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Progress block */}
      {(isProcessing || isDone) && (
        <Card className="border">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              {isProcessing ? (
                <span className="font-medium">Processando {processed} de {total}...</span>
              ) : (
                <span className="font-medium flex items-center gap-2">
                  {failedCount === 0
                    ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Concluído</>
                    : <><AlertTriangle className="w-4 h-4 text-yellow-500" /> Concluído com falhas</>
                  }
                </span>
              )}
              <span className="text-muted-foreground">{progressPct}%</span>
            </div>

            <Progress value={isProcessing ? progressPct : 100} className="h-2" />

            {/* Summary chips */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" /> {successCount} aprovada(s)
              </span>
              {skippedCount > 0 && (
                <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                  <Clock className="w-4 h-4" /> {skippedCount} já aprovada(s)
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-500">
                  <XCircle className="w-4 h-4" /> {failedCount} falhou
                </span>
              )}
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="w-4 h-4" /> {total - processed} restante(s)
              </span>
            </div>

            {/* Details toggle */}
            <button
              className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground transition-colors"
              onClick={() => setShowDetails(v => !v)}
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? "Ocultar detalhes" : "Ver detalhes"}
            </button>

            {showDetails && (
              <ScrollArea className="max-h-52 border rounded-md bg-background">
                <div className="p-2 space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <StatusIcon status={log.status} />
                      <span className="flex-1 min-w-0 truncate font-medium">{log.requester}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{log.itemCount} item(s)</Badge>
                      {log.error && <span className="text-red-500 truncate max-w-[160px]" title={log.error}>{log.error}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {isDone && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => setPhase("idle")}>
                Fechar relatório
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending list */}
      {!isProcessing && !isDone && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-medium">Nenhuma solicitação pendente!</p>
            </div>
          ) : (
            <Card className="border">
              {/* Select-all header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="h-4 w-4"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none flex-1">
                  Selecionar todos ({pending.length})
                </label>
                {someSelected && (
                  <Badge variant="secondary" className="text-xs">{selected.size} selecionado(s)</Badge>
                )}
              </div>

              <ScrollArea className="max-h-[480px]">
                <div className="divide-y">
                  {pending.map(req => {
                    const taskCount = (req.items || []).filter(i => i.type === "task").length;
                    const svcCount  = (req.items || []).filter(i => i.type === "service").length;
                    const isChecked = selected.has(req.id);

                    return (
                      <div
                        key={req.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/30 ${isChecked ? "bg-primary/5" : ""}`}
                        onClick={() => toggleOne(req.id)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(req.id)}
                          onClick={e => e.stopPropagation()}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{req.requester_name || req.requester_email}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {taskCount > 0 && (
                                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5">
                                  {taskCount}T
                                </Badge>
                              )}
                              {svcCount > 0 && (
                                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] px-1.5">
                                  {svcCount}S
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {req.requester_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {req.created_date ? format(new Date(req.created_date), "dd/MM/yyyy HH:mm") : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          )}
        </>
      )}
    </div>
  );
}