"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { AiSidebar } from "@/components/AiSidebar";
import { AiTraceTerminal, type TraceBlock } from "@/components/AiTraceTerminal";
import type { ChatMeta, ChatOp } from "@/lib/api";

type AiPanelProps = {
  onApplied: (ops: ChatOp[]) => void;
};

type Tab = "chat" | "trace";

export const AiPanel = ({ onApplied }: AiPanelProps) => {
  const [blocks, setBlocks] = useState<TraceBlock[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const idRef = useRef(0);
  const running = blocks.some((b) => b.status === "running");

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

  const tabClass = (t: Tab) =>
    clsx(
      "min-h-9 flex-1 rounded-[7px] text-[13px] font-semibold transition",
      tab === t ? "bg-white text-ink shadow-[0_1px_2px_rgba(3,33,71,0.12)]" : "text-muted hover:text-ink"
    );

  return (
    <aside
      aria-label="Copiloto de IA"
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white lg:sticky lg:top-5 lg:h-[calc(100vh-6.5rem)] lg:w-[380px] lg:shrink-0"
    >
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ecad0a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17l6-6-6-6" />
              <path d="M12 19h8" />
            </svg>
          </span>
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold">Copiloto</h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted">openai/gpt-4o-mini · OpenRouter</p>
          </div>
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              running ? "text-accent-text" : "text-[#1e6b3a]"
            )}
          >
            <span
              className={clsx(
                "h-[7px] w-[7px] rounded-full",
                running ? "animate-pulse bg-accent" : "bg-[#2e9b57]"
              )}
            />
            {running ? "Executando" : "Pronto"}
          </span>
        </div>

        <div role="tablist" aria-label="Visão do copiloto" className="flex gap-1 rounded-[10px] bg-[#f1f3f7] p-1">
          <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")} className={tabClass("chat")}>
            Conversa
          </button>
          <button type="button" role="tab" aria-selected={tab === "trace"} onClick={() => setTab("trace")} className={tabClass("trace")}>
            Execução
            {blocks.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-well px-1.5 font-mono text-[10px] text-ink">{blocks.length}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className={clsx("min-h-0 flex-1 flex-col", tab === "chat" ? "flex" : "hidden")}>
        <AiSidebar
          onApplied={onApplied}
          onTraceStart={handleTraceStart}
          onTraceEnd={handleTraceEnd}
          onOpenTrace={() => setTab("trace")}
        />
      </div>
      <div className={clsx("min-h-0 flex-1 flex-col", tab === "trace" ? "flex" : "hidden")}>
        <AiTraceTerminal blocks={blocks} onClear={() => setBlocks([])} />
      </div>
    </aside>
  );
};
