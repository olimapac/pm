"use client";

import type { ChatMeta, ChatTraceStep } from "@/lib/api";

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
  validate: "validate",
  apply: "apply",
  reload: "reload",
};

const STEP_COLORS: Record<string, string> = {
  llm_call: "bg-accent",
  parse: "bg-primary",
  validate: "bg-primary",
  apply: "bg-secondary",
};

const stepColor = (step: string) => STEP_COLORS[step] ?? "bg-[#8fa3bd]";

const fmtTime = (d: Date) => d.toLocaleTimeString("pt-BR");

export const fmtMs = (ms: number) =>
  ms >= 1000
    ? `${(ms / 1000).toFixed(2).replace(".", ",")} s`
    : `${Math.round(ms)} ms`;

export const fmtTokens = (n: number) => n.toLocaleString("pt-BR");

export const TraceBar = ({ trace }: { trace: ChatTraceStep[] }) => (
  <span className="flex h-1 w-full gap-0.5">
    {trace.map((t) => (
      <span
        key={t.step}
        className={`min-w-[3px] rounded-sm ${stepColor(t.step)}`}
        style={{ flex: `${t.duration_ms} 1 0` }}
      />
    ))}
  </span>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[10px] bg-[#f6f7fa] p-2.5">
    <p className="text-[11px] text-muted">{label}</p>
    <p className="mt-0.5 font-mono text-base font-semibold">{value}</p>
  </div>
);

const Timeline = ({ trace }: { trace: ChatTraceStep[] }) => {
  const total = trace.reduce((n, t) => n + t.duration_ms, 0) || 1;
  let acc = 0;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        Linha do tempo
      </p>
      {trace.map((t) => {
        const left = (acc / total) * 100;
        acc += t.duration_ms;
        return (
          <div key={t.step}>
            <div className="grid grid-cols-[64px_minmax(0,1fr)_56px] items-center gap-2">
              <span className="font-mono text-[11px] text-ink-3">
                {STEP_LABELS[t.step] ?? t.step}
              </span>
              <span className="relative h-2.5 rounded-[3px] bg-[#f1f3f7]">
                <span
                  className={`absolute inset-y-0 min-w-[3px] rounded-[3px] ${stepColor(t.step)}`}
                  style={{ left: `${left}%`, width: `${(t.duration_ms / total) * 100}%` }}
                />
              </span>
              <span className="text-right font-mono text-[11px]">{fmtMs(t.duration_ms)}</span>
            </div>
            <p className="ml-[72px] text-[11px] leading-4 text-muted">{t.detail}</p>
          </div>
        );
      })}
    </div>
  );
};

const TraceBlockView = ({ block }: { block: TraceBlock }) => {
  const meta = block.meta;
  const llm = meta?.trace.find((t) => t.step === "llm_call");
  return (
    <div data-testid="ai-trace-block" className="flex flex-col gap-4">
      <div>
        <p className="font-mono text-[11px] text-muted">
          {fmtTime(block.startedAt)} · POST /api/ai/chat
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink-2">&ldquo;{block.message}&rdquo;</p>
      </div>

      {block.status === "running" ? (
        <p data-testid="ai-trace-running" className="animate-pulse text-xs text-accent-text">
          Aguardando a LLM. A espera acontece no passo llm.
        </p>
      ) : null}

      {meta ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Servidor" value={fmtMs(meta.duration_ms)} />
            <Stat label="Tokens" value={fmtTokens(meta.usage.total_tokens)} />
            <Stat
              label="Na LLM"
              value={`${llm ? Math.round((llm.duration_ms / meta.duration_ms) * 100) : 0}%`}
            />
          </div>
          <Timeline trace={meta.trace} />
          <div className="rounded-[10px] bg-ink p-3 font-mono text-[11px] leading-relaxed text-[#c9d6e8]">
            <p className="mb-1.5 text-accent">$ prompt.input</p>
            <p className="whitespace-pre-wrap break-words">{meta.prompt.input}</p>
            <p className="mt-2 text-[#7fd3a0]">
              ok · in={meta.usage.input_tokens} out={meta.usage.output_tokens} total=
              {meta.usage.total_tokens} tokens
              {block.clientMs !== undefined ? ` · ida e volta ${fmtMs(block.clientMs)}` : ""}
            </p>
          </div>
        </>
      ) : null}

      {block.status === "ok" && !meta ? (
        <p className="text-xs text-muted">
          OK{block.clientMs !== undefined ? ` em ${fmtMs(block.clientMs)}` : ""}. Sem metadados de execução.
        </p>
      ) : null}

      {block.status === "error" ? (
        <p className="rounded-[10px] bg-[#fbeceb] px-3 py-2 text-xs text-danger">
          Erro: {block.error}
          {block.clientMs !== undefined ? ` (${fmtMs(block.clientMs)})` : ""}
        </p>
      ) : null}
    </div>
  );
};

export const AiTraceTerminal = ({ blocks, onClear }: AiTraceTerminalProps) => {
  const latest = blocks.at(-1);
  const older = blocks.slice(0, -1).reverse();

  return (
    <section data-testid="ai-trace" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {latest ? (
        <TraceBlockView block={latest} />
      ) : (
        <p className="text-[13px] leading-relaxed text-muted">
          Cada chamada à LLM aparece aqui passo a passo: o que o servidor fez,
          onde esperou, quanto tempo e quantos tokens gastou.
        </p>
      )}

      {older.length > 0 ? (
        <div className="flex flex-col">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Anteriores
          </p>
          {older.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 border-t border-line-soft py-2 text-xs"
            >
              <span className="font-mono text-[11px] text-muted">{fmtTime(b.startedAt)}</span>
              <span className="min-w-0 flex-1 truncate text-ink-2">{b.message}</span>
              <span className={`font-mono text-[11px] ${b.status === "error" ? "text-danger" : ""}`}>
                {b.status === "error"
                  ? "erro"
                  : b.meta
                    ? fmtMs(b.meta.duration_ms)
                    : "…"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex justify-end">
        <button
          type="button"
          data-testid="ai-trace-clear"
          onClick={onClear}
          disabled={blocks.length === 0}
          className="min-h-8 rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-[#e9ecf2] hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Limpar execuções
        </button>
      </div>
    </section>
  );
};
