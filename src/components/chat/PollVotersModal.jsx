import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

export default function PollVotersModal({ open, onClose, pollData, allUsers }) {
  const [selectedOption, setSelectedOption] = useState(null);

  const { question, options = [], votes = {} } = pollData || {};

  useEffect(() => {
    if (open && options.length > 0 && !selectedOption) {
      setSelectedOption(options[0].id);
    }
    if (!open) setSelectedOption(null);
  }, [open, options]);

  const getDisplayName = (email) => {
    const lower = email?.toLowerCase();
    const user = allUsers?.find(u => u.email?.toLowerCase() === lower);
    return user?.display_name || user?.full_name || email;
  };

  const totalVotes = Object.values(votes).reduce((acc, v) => acc + (v?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-semibold leading-snug line-clamp-2">{question}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{totalVotes} voto{totalVotes !== 1 ? "s" : ""} no total</p>
        </DialogHeader>

        {/* Option tabs */}
        <div className="flex gap-1 px-4 overflow-x-auto pb-1 flex-nowrap">
          {options.map((opt) => {
            const count = (votes[opt.id] || []).length;
            const isActive = selectedOption === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt.text} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Voters list */}
        <div className="px-4 pb-4 pt-2 min-h-[120px] max-h-[55vh] overflow-y-auto space-y-1">
          {selectedOption && (() => {
            const voters = votes[selectedOption] || [];
            if (voters.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum voto nesta opção.</p>
              );
            }
            return voters.map((email) => (
              <div key={email} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {getDisplayName(email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm truncate">{getDisplayName(email)}</span>
              </div>
            ));
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}