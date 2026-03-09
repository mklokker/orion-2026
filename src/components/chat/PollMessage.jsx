import React, { useState } from "react";
import { Check, Lock, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PollVotersModal from "./PollVotersModal";

const ChatMessageEntity = base44.entities.ChatMessage;

export default function PollMessage({ message, currentUser, isOwn, allUsers }) {
  const [showVoters, setShowVoters] = useState(false);
  const pollData = message.poll_data;
  if (!pollData || !pollData.options) {
    return <p className="text-sm italic opacity-70">Enquete inválida</p>;
  }

  const { question, options = [], votes = {}, closed = false, multiple_choice = false } = pollData;

  const totalVotes = Object.values(votes).reduce((acc, voters) => acc + (voters?.length || 0), 0);

  const hasVotedFor = (optionId) => {
    const voters = votes[optionId] || [];
    return voters.includes(currentUser?.email);
  };

  const hasVoted = options.some(opt => hasVotedFor(opt.id));

  const handleVote = async (optionId) => {
    if (closed || !currentUser?.email) return;

    const currentVotes = {};
    for (const key of Object.keys(votes)) {
      currentVotes[key] = [...(votes[key] || [])];
    }

    if (!multiple_choice) {
      // Single choice: remove vote from all other options
      for (const key of Object.keys(currentVotes)) {
        currentVotes[key] = currentVotes[key].filter(e => e !== currentUser.email);
      }
    }

    // Toggle vote on this option
    const optVoters = [...(currentVotes[optionId] || [])];
    if (optVoters.includes(currentUser.email)) {
      currentVotes[optionId] = optVoters.filter(e => e !== currentUser.email);
    } else {
      currentVotes[optionId] = [...optVoters, currentUser.email];
    }

    await ChatMessageEntity.update(message.id, {
      poll_data: { ...message.poll_data, votes: currentVotes }
    });
  };

  const handleClosePoll = async () => {
    await ChatMessageEntity.update(message.id, {
      poll_data: { ...message.poll_data, closed: true }
    });
  };

  const showResults = hasVoted || closed;

  return (
    <>
    <PollVotersModal
      open={showVoters}
      onClose={() => setShowVoters(false)}
      pollData={pollData}
      allUsers={allUsers}
    />
    <div className="space-y-3" style={{ minWidth: "min(240px, 60vw)" }}>
      {/* Question */}
      <p className="font-semibold text-sm leading-snug">{question}</p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const optVoters = votes[opt.id] || [];
          const count = optVoters.length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = hasVotedFor(opt.id);

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={closed}
              className={`relative w-full text-left rounded-lg overflow-hidden border text-sm py-2 px-3 transition-all ${
                voted
                  ? isOwn
                    ? "border-white/50 bg-white/15"
                    : "border-primary/60 bg-primary/10"
                  : isOwn
                  ? "border-white/20 bg-white/5 hover:bg-white/10"
                  : "border-border bg-background/50 hover:bg-accent"
              } ${closed ? "cursor-default" : "cursor-pointer"}`}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className={`absolute inset-0 opacity-15 transition-all duration-500 ${isOwn ? "bg-white" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0">
                  {voted && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{opt.text}</span>
                </span>
                {showResults && (
                  <span className="text-xs opacity-70 shrink-0 font-medium">
                    {pct}% · {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs opacity-60 flex items-center gap-1">
          {closed ? (
            <>
              <Lock className="w-3 h-3" />
              Encerrada · {totalVotes} voto{totalVotes !== 1 ? "s" : ""}
            </>
          ) : (
            `${totalVotes} voto${totalVotes !== 1 ? "s" : ""}${multiple_choice ? " · múltipla escolha" : ""}`
          )}
        </p>
        {isOwn && !closed && (
          <button
            onClick={handleClosePoll}
            className="text-xs opacity-60 hover:opacity-100 underline transition-opacity shrink-0"
          >
            Encerrar
          </button>
        )}
      </div>
    </div>
  );
}