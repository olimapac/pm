"use client";

import { useRef, useState } from "react";
import { AiSidebar } from "@/components/AiSidebar";
import { AiTraceTerminal, type TraceBlock } from "@/components/AiTraceTerminal";
import type { ChatMeta } from "@/lib/api";

type AiPanelProps = {
  onApplied: () => void;
};

export const AiPanel = ({ onApplied }: AiPanelProps) => {
  const [blocks, setBlocks] = useState<TraceBlock[]>([]);
  const idRef = useRef(0);

  const handleTraceStart = (message: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setBlocks((prev) => [
      ...prev.slice(-29),
      { id, message, status: "running", startedAt: new Date() },
    ]);
    return id;
  };

  const handleTraceEnd = (
    id: number,
    clientMs: number,
    meta?: ChatMeta,
    error?: string
  ) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? {
              ...block,
              status: error ? ("error" as const) : ("ok" as const),
              clientMs,
              meta,
              error,
            }
          : block
      )
    );
  };

  return (
    <div className="flex w-full flex-col gap-3 lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:w-[360px] lg:shrink-0">
      <AiSidebar
        onApplied={onApplied}
        onTraceStart={handleTraceStart}
        onTraceEnd={handleTraceEnd}
      />
      <div className="flex h-60 min-h-0 flex-col lg:h-auto lg:flex-1">
        <AiTraceTerminal blocks={blocks} onClear={() => setBlocks([])} />
      </div>
    </div>
  );
};
