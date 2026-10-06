import type { ChatMeta, ChatTraceStep } from "@/lib/api";

const STEP_LABELS: Record<string, string> = {
  load_board: "Ler quadro",
  build_prompt: "Montar pedido",
  llm_call: "Modelo pensando",
  parse: "Interpretar",
  validate: "Validar",
};

const STEP_COLORS: Record<string, string> = {
  llm_call: "bg-accent",
  parse: "bg-primary",
  validate: "bg-primary",
};

const stepColor = (step: string) => STEP_COLORS[step] ?? "bg-stage-2";

export const fmtMs = (ms: number) =>
  ms >= 1000
    ? `${(ms / 1000).toFixed(1).replace(".", ",")} s`
    : `${Math.round(ms)} ms`;

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const TraceBar = ({ trace }: { trace: ChatTraceStep[] }) => (
  <span className="flex h-1 w-16 gap-0.5" aria-hidden="true">
    {trace.map((t) => (
      <span
        key={t.step}
        className={`min-w-[3px] rounded-sm ${stepColor(t.step)}`}
        style={{ flex: `${t.duration_ms} 1 0` }}
      />
    ))}
  </span>
);

export const TraceDetails = ({ meta, rationale }: { meta: ChatMeta; rationale: string }) => {
  const total = meta.trace.reduce((n, t) => n + t.duration_ms, 0) || 1;
  const llm = meta.trace.find((t) => t.step === "llm_call");
  let acc = 0;

  return (
    <details data-testid="ai-trace" className="group rounded-lg text-xs">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2.5 rounded-lg px-2 text-muted transition hover:bg-hover hover:text-ink">
        <TraceBar trace={meta.trace} />
        <span className="tabular">
          {fmtMs(meta.duration_ms)} · {fmtInt(meta.usage.total_tokens)} tokens
        </span>
        <span className="ml-auto text-primary-text group-open:hidden">Como cheguei aqui</span>
        <span className="ml-auto hidden text-primary-text group-open:inline">Ocultar</span>
      </summary>

      <div className="flex flex-col gap-3 px-2 pb-1 pt-3">
        <p className="text-sm leading-relaxed text-ink-2">{rationale}</p>
        <p className="leading-relaxed text-ink-3">
          {llm
            ? `${Math.round((llm.duration_ms / meta.duration_ms) * 100)}% do tempo foi a espera pelo modelo. O resto do processo levou ${fmtMs(meta.duration_ms - llm.duration_ms)}.`
            : `Resposta montada em ${fmtMs(meta.duration_ms)}.`}
        </p>

        <ol className="flex flex-col gap-1.5">
          {meta.trace.map((t) => {
            const left = (acc / total) * 100;
            acc += t.duration_ms;
            return (
              <li key={t.step} title={t.detail}>
                <div className="grid grid-cols-[112px_minmax(0,1fr)_52px] items-center gap-2">
                  <span className="text-ink-3">{STEP_LABELS[t.step] ?? t.step}</span>
                  <span className="relative h-2 rounded-sm bg-track">
                    <span
                      className={`absolute inset-y-0 min-w-[3px] rounded-sm ${stepColor(t.step)}`}
                      style={{ left: `${left}%`, width: `${(t.duration_ms / total) * 100}%` }}
                    />
                  </span>
                  <span className="tabular text-right">{fmtMs(t.duration_ms)}</span>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="tabular text-muted">
          {meta.model} · entrada {fmtInt(meta.usage.input_tokens)} · saída{" "}
          {fmtInt(meta.usage.output_tokens)} tokens
        </p>

        <div className="rounded-lg bg-ink p-3 font-mono leading-relaxed text-on-ink">
          <p className="mb-1 font-sans font-semibold text-accent">Conversa enviada ao modelo</p>
          <p className="whitespace-pre-wrap break-words">{meta.prompt.input}</p>
        </div>
      </div>
    </details>
  );
};
