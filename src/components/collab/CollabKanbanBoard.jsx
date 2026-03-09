import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CollabProjectCard from "./CollabProjectCard";
import { Badge } from "@/components/ui/badge";

const KANBAN_COLUMNS = [
  { id: "rascunho",    label: "Rascunho",     dotColor: "bg-gray-400" },
  { id: "ativo",       label: "Ativo",         dotColor: "bg-blue-500" },
  { id: "em_andamento",label: "Em Andamento",  dotColor: "bg-yellow-500" },
  { id: "concluido",   label: "Concluído",     dotColor: "bg-green-500" },
  { id: "arquivado",   label: "Arquivado",     dotColor: "bg-red-400" },
];

export default function CollabKanbanBoard({
  projects, participantsMap, checklistItemsMap, users,
  onStatusChange, onProjectClick,
}) {
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Horizontal scroll container — enables mobile scroll without breaking layout */}
      <div className="overflow-x-auto overflow-y-hidden pb-4" style={{ minHeight: "calc(100vh - 260px)" }}>
        <div className="flex gap-3 min-w-max px-1 pb-2 items-start">
          {KANBAN_COLUMNS.map(col => {
            const colProjects = projects.filter(p => p.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-xl bg-muted/40 border border-border overflow-hidden"
                style={{ width: 288 }}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/60 shrink-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
                  <span className="font-semibold text-sm text-foreground flex-1">{col.label}</span>
                  <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal">
                    {colProjects.length}
                  </Badge>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        flex-1 p-2 space-y-2 overflow-y-auto transition-colors
                        ${snapshot.isDraggingOver ? "bg-primary/5" : ""}
                      `}
                      style={{ minHeight: 120 }}
                    >
                      {colProjects.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/60 border-2 border-dashed border-border rounded-lg">
                          Nenhum projeto
                        </div>
                      )}

                      {colProjects.map((project, index) => (
                        <Draggable
                          key={project.id}
                          draggableId={project.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                            >
                              <CollabProjectCard
                                project={project}
                                participants={participantsMap[project.id] || []}
                                checklistItems={checklistItemsMap[project.id] || []}
                                users={users}
                                onClick={() => onProjectClick(project.id)}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}