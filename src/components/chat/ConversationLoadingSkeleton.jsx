import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationLoadingSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            {i % 2 === 0 && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
            <Skeleton className={`h-10 ${i % 2 === 0 ? "w-40" : "w-32"} rounded-lg`} />
          </div>
        ))}
      </div>
    </div>
  );
}