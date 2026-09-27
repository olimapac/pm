"use client";

import { useEffect, useRef } from "react";
import type { ChatMeta } from "@/lib/api";

export type TraceBlock = {
  id: number;
  message: string;
  status: "running" | "ok" | "error";
  startedAt: Date;
  clientMs?: number;
  meta?: ChatMeta;
  error?: string;
};

type AiTraceTerminalProps = {
  blocks: TraceBlock[];
  onClear: () => void;
};

const STEP_LABELS: Record<string, string> = {
  load_board: "board",
  build_prompt: "prompt",
  llm_call: "llm",
  parse: "parse",
  validate: "valid",
  apply: "apply",
  reload: "reload",
};

const fmtTime = (d: Date) => d.toLocaleTimeString();

const fmtMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

const TraceBlockView = ({ block }: { block: TraceBlock }) => (
  <div data-testid="ai-trace-block" className="border-b border-white/10 py-1.5 last:border-0">
    <p className="text-slate-100">
      <span className="text-[var(--accent-yellow)]">$</span> [{fmtTime(block.startedAt)}]{" "}
      &quot;{block.message}&quot;
    </p>
    <p className="text-slate-400">→ POST /api/ai/chat</p>
    {block.status === "running" ? (
      <p data-testid="ai-trace-running" className="animate-pulse text-slate-300">
        … aguardando a LLM (a espera acontece no passo [llm])
      </p>
    ) : null}
    {block.meta?.trace.map((t) => (
      <p
        key={t.step}
        className={
          t.step === "llm_call" ? "text-[var(--accent-yellow)]" : "text-slate-400"
        }
      >
        [{STEP_LABELS[t.step] ?? t.step}] {t.detail} ({fmtMs(t.duration_ms)})
      </p>
    ))}
    {block.meta?.prompt ? (
      <div className="mt-1 rounded-lg border border-cyan-300/30 bg-cyan-950/60 px-2 py-1 text-cyan-200">
        <p className="font-semibold">[prompt] input:</p>
        <p className="whitespace-pre-wrap break-words">{block.meta.prompt.input}</p>
      </div>
    ) : null}
    {block.status === "ok" ? (
      <p className="text-emerald-300">
        OK em {block.meta ? `${fmtMs(block.meta.duration_ms)} (servidor) / ` : ""}
        {block.clientMs !== undefined ? `${fmtMs(block.clientMs)} (ida-volta)` : ""}
        {block.meta
          ? ` | in=${block.meta.usage.input_tokens} out=${block.meta.usage.output_tokens} total=${block.meta.usage.total_tokens} tokens`
          : " | meta indisponivel"}
      </p>
    ) : null}
    {block.status === "error" ? (
      <p className="text-red-400">
        ERRO: {block.error}
        {block.clientMs !== undefined ? ` (${fmtMs(block.clientMs)})` : ""}
      </p>
    ) : null}
  </div>
);

export const AiTraceTerminal = ({ blocks, onClear }: AiTraceTerminalProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [blocks]);

  return (
    <section
      data-testid="ai-trace"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[var(--navy-dark)] shadow-[var(--shadow)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          LLM trace
        </h2>
        <button
          type="button"
          data-testid="ai-trace-clear"
          onClick={onClear}
          disabled={blocks.length === 0}
          className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-300 transition hover:text-white disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      <div
        ref={bodyRef}
        className="min-h-[140px] flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px] leading-5"
      >
        {blocks.length === 0 ? (
          <p className="py-1.5 text-slate-500">
            Cada chamada a LLM aparece aqui passo a passo: o que o servidor fez,
            onde esperou, quanto tempo e quantos tokens gastou.
          </p>
        ) : (
          blocks.map((block) => <TraceBlockView key={block.id} block={block} />)
        )}
      </div>
    </section>
  );
};
