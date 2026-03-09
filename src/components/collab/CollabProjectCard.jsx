import React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, AlertTriangle, CheckSquare } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_COLORS = {
  baixa:   "bg-green-50 text-green-700 border-0",
  media:   "bg-yellow-50 text-yellow-700 border-0",
  alta:    "bg-orange-50 text-orange-700 border-0",
  urgente: "bg-red-50 text-red-700 border-0",
};
const PRIORITY_LABELS = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };

export default function CollabProjectCard({ project, participants = [], checklistItems = [], users = [], onClick, isDragging = false }) {
  const getUser    = (email) => users.find(u => u.email === email);
  const getName    = (email) => { const u = getUser(email); return u?.display_name || u?.full_name || email; };
  const getAvatar  = (email) => getUser(email)?.profile_picture;
  const getInitial = (email) => getName(email)?.[0]?.toUpperCase() || "?";

  const isOverdue = project.due_date &&
    new Date(project.due_date + "T23:59:59") < new Date() &&
    !["concluido", "arquivado"].includes(project.status);

  const totalItems = checklistItems.length;
  const doneItems  = checklistItems.filter(i => i.is_done).length;
  const progress   = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : null;

  // Show up to 3 participant avatars (exclude owner to save space)
  const nonOwnerParticipants = participants.filter(p => p.role !== "owner");
  const visibleParticipants  = nonOwnerParticipants.slice(0, 3);
  const extraCount           = Math.max(0, nonOwnerParticipants.length - 3);

  const responsible = project.responsible_email ? getName(project.responsible_email) : null;

  return (
    <div
      onClick={onClick}
      className={`
        bg-card border border-border rounded-xl p-3.5 cursor-pointer
        hover:shadow-md hover:border-primary/30 transition-all group select-none
        ${isDragging ? "shadow-xl border-primary/50 rotate-1 opacity-95" : ""}
      `}
      style={{ borderLeft: `4px solid ${project.color_tag || "#4338CA"}` }}
    >
      {/* Title + priority */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1 text-sm leading-snug">
          {project.title}
        </h3>
        <Badge className={`text-[10px] shrink-0 mt-0.5 ${PRIORITY_COLORS[project.priority]}`}>
          {PRIORITY_LABELS[project.priority]}
        </Badge>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Responsible */}
      {responsible && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          <span className="font-medium">Resp:</span> {responsible}
        </p>
      )}

      {/* Checklist progress */}
      {progress !== null && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {doneItems}/{totalItems}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: participants + due date */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        {/* Participant avatars */}
        <div className="flex items-center">
          {visibleParticipants.length > 0 ? (
            <div className="flex -space-x-1.5">
              {visibleParticipants.map(p => (
                <Avatar key={p.id} className="w-5 h-5 border border-background">
                  <AvatarImage src={getAvatar(p.user_email)} />
                  <AvatarFallback className="text-[8px] bg-muted">{getInitial(p.user_email)}</AvatarFallback>
                </Avatar>
              ))}
              {extraCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground font-medium">+{extraCount}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">Sem participantes</span>
          )}
        </div>

        {/* Due date + overdue */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isOverdue && (
            <Badge className="text-[10px] bg-red-100 text-red-700 border-0 gap-0.5 px-1.5 py-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Atrasado
            </Badge>
          )}
          {project.due_date && (
            <div className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="w-3 h-3" />
              {format(new Date(project.due_date + "T00:00:00"), "dd/MM/yy")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}