import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  createChecklist, createChecklistItem,
  toggleChecklistItem, deleteChecklist,
} from "@/components/collab/collabService";

export default function ProjectChecklists({
  projectId, checklists, checklistItems,
  currentUser, users, canEdit, onReload,
}) {
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList]     = useState(false);
  const [newItems, setNewItems]         = useState({});
  const [collapsed, setCollapsed]       = useState({});
  const [saving, setSaving]             = useState(false);

  const getUserName = (email) => {
    const u = users.find(u => u.email === email);
    return u?.display_name || u?.full_name || email;
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    setSaving(true);
    await createChecklist(projectId, newListTitle.trim(), currentUser.email, checklists.length);
    setNewListTitle("");
    setAddingList(false);
    await onReload();
    setSaving(false);
  };

  const handleCreateItem = async (checklistId) => {
    const text = (newItems[checklistId] || "").trim();
    if (!text) return;
    setSaving(true);
    await createChecklistItem(checklistId, projectId, text, currentUser.email);
    setNewItems(prev => ({ ...prev, [checklistId]: "" }));
    await onReload();
    setSaving(false);
  };

  const handleToggle = async (item) => {
    await toggleChecklistItem(item.id, !item.is_done, currentUser.email);
    onReload();
  };

  const handleDeleteList = async (checklistId) => {
    if (!confirm("Excluir esta checklist e todos seus itens?")) return;
    await deleteChecklist(checklistId);
    onReload();
  };

  const allItems  = Object.values(checklistItems).flat();
  const doneItems = allItems.filter(i => i.is_done);
  const progress  = allItems.length > 0
    ? Math.round((doneItems.length / allItems.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      {allItems.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso geral</span>
            <span>{doneItems.length}/{allItems.length} ({progress}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {checklists.length === 0 && !canEdit && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma checklist criada.</p>
      )}

      {checklists.map(list => {
        const items     = checklistItems[list.id] || [];
        const done      = items.filter(i => i.is_done).length;
        const isCollapsed = collapsed[list.id];
        const listProg  = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

        return (
          <div key={list.id} className="border border-border rounded-xl overflow-hidden">
            {/* List header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 cursor-pointer select-none"
              onClick={() => setCollapsed(prev => ({ ...prev, [list.id]: !prev[list.id] }))}
            >
              {isCollapsed
                ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                : <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
              }
              <span className="font-medium text-sm truncate flex-1">{list.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs font-normal">
                  {done}/{items.length}
                </Badge>
                {items.length > 0 && (
                  <span className="text-xs text-muted-foreground">{listProg}%</span>
                )}
                {canEdit && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteList(list.id); }}
                    className="p-1 hover:text-destructive transition-colors"
                    title="Excluir checklist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress mini bar */}
            {!isCollapsed && items.length > 0 && (
              <div className="h-1 bg-muted">
                <div
                  className="h-full bg-green-400 transition-all duration-300"
                  style={{ width: `${listProg}%` }}
                />
              </div>
            )}

            {/* Items */}
            {!isCollapsed && (
              <div className="p-3 space-y-1.5">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">Nenhum item ainda.</p>
                )}
                {items.map(item => (
                  <div key={item.id} className="flex items-start gap-2.5 py-0.5 group">
                    <Checkbox
                      checked={item.is_done}
                      onCheckedChange={() => handleToggle(item)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${
                        item.is_done ? "line-through text-muted-foreground" : "text-foreground"
                      }`}>
                        {item.text}
                      </p>
                      {item.is_done && item.completed_by && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ✓ {getUserName(item.completed_by)}
                        </p>
                      )}
                      {item.assigned_to && !item.is_done && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          → {getUserName(item.assigned_to)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add item input */}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Adicionar item..."
                      value={newItems[list.id] || ""}
                      onChange={e =>
                        setNewItems(prev => ({ ...prev, [list.id]: e.target.value }))
                      }
                      onKeyDown={e => e.key === "Enter" && handleCreateItem(list.id)}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCreateItem(list.id)}
                      disabled={saving}
                      className="h-8 px-2 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* New checklist */}
      {canEdit && (
        addingList ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nome da checklist..."
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateList()}
              autoFocus
              className="h-9"
            />
            <Button size="sm" onClick={handleCreateList} disabled={saving || !newListTitle.trim()}>
              Criar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingList(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingList(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" /> Nova Checklist
          </Button>
        )
      )}
    </div>
  );
}