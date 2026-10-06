"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { sendChat, type ChatMeta, type ChatOp } from "@/lib/api";
import { TraceBar, fmtMs, fmtTokens } from "@/components/AiTraceTerminal";

type Message = {
  role: "user" | "assistant";
  content: string;
  ops?: ChatOp[];
  columnTitles?: Record<number, string>;
  meta?: ChatMeta;
};

type AiSidebarProps = {
  onApplied: (ops: ChatOp[]) => void;
  onTraceStart?: (message: string) => number;
  onTraceEnd?: (
    id: number,
    clientMs: number,
    meta?: ChatMeta,
    error?: string
  ) => void;
  onOpenTrace?: () => void;
};

const SUGGESTIONS = [
  "O que está parado em Review?",
  "Divida o primeiro cartão do Backlog em três",
  "Mova tudo de Review para Done",
];

const OP_LABELS: Record<ChatOp["op"], { verb: string; color: string }> = {
  create_card: { verb: "CRIAR", color: "text-primary-text" },
  update_card: { verb: "EDITAR", color: "text-primary-text" },
  move_card: { verb: "MOVER", color: "text-secondary" },
  delete_card: { verb: "REMOVER", color: "text-danger" },
  rename_column: { verb: "RENOMEAR", color: "text-accent-text" },
};

const describeOp = (op: ChatOp, titles: Record<number, string>) => {
  const col = (id?: number) => (id !== undefined ? titles[id] ?? `coluna ${id}` : "");
  if (op.op === "create_card") return `${col(op.column_id)} · ${op.title}`;
  if (op.op === "move_card") return `para ${col(op.to_column_id)}`;
  if (op.op === "update_card") return op.title ?? "detalhes";
  if (op.op === "rename_column") return `${op.title}`;
  return "cartão removido";
};

const OpsList = ({ ops, titles }: { ops: ChatOp[]; titles: Record<number, string> }) => (
  <div className="overflow-hidden rounded-[10px] border border-line">
    <p className="border-b border-line bg-[#f8f9fb] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
      {ops.length} {ops.length === 1 ? "alteração aplicada" : "alterações aplicadas"}
    </p>
    {ops.map((op, i) => (
      <div
        key={i}
        className="flex items-center gap-2.5 border-t border-line-soft px-3 py-2 text-xs first-of-type:border-t-0"
      >
        <span className={`w-16 font-mono text-[10px] font-semibold ${OP_LABELS[op.op].color}`}>
          {OP_LABELS[op.op].verb}
        </span>
        {op.card_id !== undefined ? (
          <span className="font-mono text-muted">#{op.card_id}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-ink-2">{describeOp(op, titles)}</span>
      </div>
    ))}
  </div>
);

export const AiSidebar = ({
  onApplied,
  onTraceStart,
  onTraceEnd,
  onOpenTrace,
}: AiSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const text = input.trim();
    if (!text || sending) {
      return;
    }
    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setSending(true);
    setError(null);
    const traceId = onTraceStart?.(text) ?? -1;
    const t0 = performance.now();
    try {
      const { reply, applied, ops, columnTitles, meta } = await sendChat(
        text,
        messages.map(({ role, content }) => ({ role, content }))
      );
      setMessages([...history, { role: "assistant", content: reply, ops, columnTitles, meta }]);
      onTraceEnd?.(traceId, performance.now() - t0, meta);
      if (applied) {
        onApplied(ops);
      }
    } catch {
      setError("Não foi possível falar com o copiloto. Tente de novo.");
      onTraceEnd?.(traceId, performance.now() - t0, undefined, "Copiloto inacessível.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div data-testid="ai-sidebar" className="flex min-h-0 flex-1 flex-col">
      <div
        data-testid="ai-messages"
        className="flex min-h-[200px] flex-1 flex-col gap-3.5 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="mt-auto flex flex-col gap-2">
            <p className="text-[13px] leading-relaxed text-muted">
              Peça em linguagem natural. O copiloto cria, edita e move cartões no quadro.
            </p>
            <p className="text-xs text-muted">Sugestões</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="min-h-8 rounded-full border border-[#dde2ea] bg-white px-2.5 text-xs text-ink-3 transition hover:border-primary hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) =>
            message.role === "user" ? (
              <p
                key={index}
                className="max-w-[88%] self-end whitespace-pre-wrap rounded-xl rounded-br-[4px] bg-ink px-3 py-2.5 text-[13px] leading-normal text-white"
              >
                {message.content}
              </p>
            ) : (
              <div key={index} className="flex w-full flex-col gap-2.5">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
                  {message.content}
                </p>
                {message.ops && message.ops.length > 0 ? (
                  <OpsList ops={message.ops} titles={message.columnTitles ?? {}} />
                ) : null}
                {message.meta ? (
                  <button
                    type="button"
                    onClick={onOpenTrace}
                    className="flex w-full flex-col gap-1.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#e9ecf2]"
                  >
                    <TraceBar trace={message.meta.trace} />
                    <span className="flex w-full justify-between font-mono text-[11px] text-muted">
                      <span>
                        {fmtMs(message.meta.duration_ms)} · {fmtTokens(message.meta.usage.total_tokens)} tokens
                      </span>
                      <span className="text-primary-text">ver execução →</span>
                    </span>
                  </button>
                ) : null}
              </div>
            )
          )
        )}
        {sending ? (
          <p data-testid="ai-loading" className="flex items-center gap-2 text-xs text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Pensando…
          </p>
        ) : null}
        {error ? (
          <p data-testid="ai-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-line-soft px-4 pb-4 pt-3">
        <label htmlFor="ai-input" className="sr-only">
          Pergunte ao copiloto
        </label>
        <div className="flex items-end gap-2 rounded-xl border border-[#d5dbe4] bg-white py-2 pl-3 pr-2 transition focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
          <textarea
            id="ai-input"
            data-testid="ai-input"
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Peça para criar, editar ou mover cartões…"
            disabled={sending}
            className="min-w-0 flex-1 resize-none bg-transparent text-[13px] leading-normal text-ink outline-none placeholder:text-muted disabled:opacity-60"
          />
          <button
            data-testid="ai-send"
            type="submit"
            aria-label="Enviar"
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-secondary text-white transition hover:bg-secondary-hover disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="font-mono text-[11px] text-muted">Enter envia · Shift+Enter quebra linha</p>
      </form>
    </div>
  );
};
