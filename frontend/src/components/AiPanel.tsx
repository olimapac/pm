"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import * as api from "@/lib/api";
import type { ChatMeta, ChatOp, ServerBoard } from "@/lib/api";
import { invertOps } from "@/lib/kanban";
import { TraceDetails } from "@/components/TraceDetails";

type PlanStatus = "pending" | "applying" | "applied" | "discarded" | "undoing" | "undone";

type Message = {
  role: "user" | "assistant";
  content: string;
  ops?: ChatOp[];
  board?: ServerBoard | null;
  meta?: ChatMeta;
  status?: PlanStatus;
  applied?: ChatOp[];
  planError?: string;
};

type AiPanelProps = {
  open: boolean;
  onToggle: () => void;
  onChanged: (ops: ChatOp[], undone: boolean) => void;
  onPlanChange?: (cardIds: string[]) => void;
  onPlanFocus?: (cardId: string | null) => void;
};

const SUGGESTIONS = [
  "O que está parado em revisão?",
  "Divida o primeiro cartão do Backlog em três",
  "Crie um cartão para revisar a acessibilidade",
];

const VERBS: Record<ChatOp["op"], { label: string; color: string }> = {
  create_card: { label: "Criar", color: "text-primary-text" },
  update_card: { label: "Editar", color: "text-primary-text" },
  move_card: { label: "Mover", color: "text-secondary" },
  delete_card: { label: "Remover", color: "text-danger" },
  rename_column: { label: "Renomear", color: "text-accent-text" },
};

const describeOp = (op: ChatOp, board?: ServerBoard | null) => {
  const columns = board?.columns ?? [];
  const column = (id?: number) => columns.find((c) => c.id === id)?.title ?? `coluna ${id}`;
  const card = (id?: number) =>
    columns.flatMap((c) => c.cards).find((c) => c.id === id)?.title ?? `cartão #${id}`;
  if (op.op === "create_card") return `“${op.title}” em ${column(op.column_id)}`;
  if (op.op === "move_card") return `“${card(op.card_id)}” para ${column(op.to_column_id)}`;
  if (op.op === "delete_card") return `“${card(op.card_id)}”`;
  if (op.op === "rename_column") return `${column(op.column_id)} para “${op.title}”`;
  return op.title && op.title !== card(op.card_id)
    ? `“${card(op.card_id)}” para “${op.title}”`
    : `detalhes de “${card(op.card_id)}”`;
};

const findCard = (board: ServerBoard | null | undefined, id?: number) => {
  for (const column of board?.columns ?? []) {
    const card = column.cards.find((c) => c.id === id);
    if (card) return { card, column };
  }
  return null;
};

// One plain sentence per op, built from the board snapshot the plan was made on.
export const explainPlan = (ops: ChatOp[], board?: ServerBoard | null) => {
  if (ops.length === 0) {
    return "Nenhuma mudança no quadro era necessária; só respondi.";
  }
  const column = (id?: number) => board?.columns.find((c) => c.id === id)?.title ?? `coluna ${id}`;
  return ops
    .map((op) => {
      const found = findCard(board, op.card_id);
      const where = found
        ? `“${found.card.title}” (#${op.card_id}) em ${found.column.title}`
        : `o cartão #${op.card_id}`;
      if (op.op === "create_card") return `Vou criar “${op.title}” em ${column(op.column_id)}.`;
      if (op.op === "move_card") return `Encontrei ${where} e vou movê-lo para ${column(op.to_column_id)}.`;
      if (op.op === "update_card") return `Encontrei ${where} e vou editá-lo.`;
      if (op.op === "delete_card") return `Encontrei ${where} e vou removê-lo.`;
      return `Vou renomear a coluna ${column(op.column_id)} para “${op.title}”.`;
    })
    .join(" ");
};

const plural = (n: number) => (n === 1 ? "1 alteração" : `${n} alterações`);

const STATUS_TEXT: Record<PlanStatus, (n: number) => string> = {
  pending: (n) => `Plano com ${plural(n)}. Nada mudou ainda.`,
  applying: () => "Aplicando…",
  applied: (n) => `${plural(n)} ${n === 1 ? "aplicada" : "aplicadas"} ao quadro.`,
  discarded: () => "Plano descartado. O quadro não mudou.",
  undoing: () => "Desfazendo…",
  undone: () => "Alterações desfeitas. O quadro voltou ao estado anterior.",
};

const ghostButton =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-3 transition hover:bg-hover hover:text-ink disabled:opacity-50";

const PlanCard = ({
  message,
  onApply,
  onDiscard,
  onUndo,
  onFocusCard,
}: {
  message: Message;
  onApply: () => void;
  onDiscard: () => void;
  onUndo: () => void;
  onFocusCard: (cardId: string | null) => void;
}) => {
  const ops = message.ops ?? [];
  const status = message.status ?? "pending";
  const done = status === "discarded" || status === "undone";

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-xl border",
        status === "pending" ? "border-accent bg-accent-soft/40" : "border-line bg-white"
      )}
    >
      <ul className="flex flex-col">
        {ops.map((op, i) => {
          const cardId = op.card_id !== undefined && status === "pending" ? String(op.card_id) : null;
          return (
            <li
              key={i}
              onMouseEnter={() => cardId && onFocusCard(cardId)}
              onMouseLeave={() => onFocusCard(null)}
              className={clsx(
                "flex items-baseline gap-3 border-b border-line-soft px-3 py-2.5 text-sm last:border-b-0",
                cardId && "hover:bg-accent-soft"
              )}
            >
              <span className={clsx("w-[4.5rem] shrink-0 text-xs font-semibold uppercase tracking-wide", done ? "text-muted" : VERBS[op.op].color)}>
                {VERBS[op.op].label}
              </span>
              <span className={clsx("min-w-0 flex-1", done ? "text-muted line-through" : "text-ink-2")}>
                {op.card_id !== undefined ? <span className="tabular mr-1.5 text-muted">#{op.card_id}</span> : null}
                <span>{describeOp(op, message.board)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-white px-3 py-2.5">
        <p role="status" className="basis-full text-xs text-muted">
          {STATUS_TEXT[status](ops.length)}
        </p>
        {status === "pending" || status === "applying" ? (
          <>
            <button type="button" onClick={onDiscard} disabled={status === "applying"} className={ghostButton}>
              Descartar
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={status === "applying"}
              className="min-h-9 rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition hover:bg-secondary-hover disabled:opacity-60"
            >
              {status === "applying" ? "Aplicando…" : "Aplicar"}
            </button>
          </>
        ) : null}
        {status === "applied" || status === "undoing" ? (
          <button type="button" onClick={onUndo} disabled={status === "undoing"} className={ghostButton}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
            </svg>
            Desfazer
          </button>
        ) : null}
      </div>
      {message.planError ? (
        <p role="alert" className="border-t border-line-soft bg-danger-soft px-3 py-2 text-xs text-danger">
          {message.planError}
        </p>
      ) : null}
    </div>
  );
};

export const AiPanel = ({ open, onToggle, onChanged, onPlanChange, onPlanFocus }: AiPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingIds = messages
    .filter((m) => m.status === "pending")
    .flatMap((m) => m.ops ?? [])
    .filter((op) => op.card_id !== undefined)
    .map((op) => String(op.card_id))
    .join(",");

  useEffect(() => {
    onPlanChange?.(pendingIds ? pendingIds.split(",") : []);
    if (!pendingIds) {
      onPlanFocus?.(null);
    }
  }, [pendingIds]);

  const update = (index: number, patch: Partial<Message>) =>
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

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
    try {
      const { reply, ops, board, meta } = await api.sendChat(
        text,
        messages.map(({ role, content }) => ({ role, content }))
      );
      setMessages([
        ...history,
        { role: "assistant", content: reply, ops, board, meta, status: ops.length ? "pending" : undefined },
      ]);
    } catch {
      setMessages(messages);
      setInput(text);
      setError("Não consegui falar com o copiloto. Seu pedido voltou para o campo; tente enviar de novo.");
    } finally {
      setSending(false);
    }
  };

  const apply = async (index: number) => {
    const message = messages[index];
    update(index, { status: "applying", planError: undefined });
    try {
      const applied = await api.applyOps(message.ops ?? []);
      update(index, { status: "applied", applied });
      onChanged(applied, false);
    } catch {
      update(index, {
        status: "pending",
        planError: "Não consegui aplicar. O quadro pode ter mudado desde o plano; peça de novo.",
      });
    }
  };

  const undo = async (index: number) => {
    const message = messages[index];
    if (!message.applied || !message.board) {
      return;
    }
    update(index, { status: "undoing", planError: undefined });
    try {
      const { ops, restores } = invertOps(message.applied, message.board);
      const result = await api.applyOps(ops);
      for (const r of restores) {
        await api.moveCardTo(String(result[r.index].card_id), String(r.columnId), r.position);
      }
      update(index, { status: "undone" });
      onChanged(message.applied, true);
    } catch {
      update(index, {
        status: "applied",
        planError: "Não consegui desfazer. O quadro mudou depois da aplicação.",
      });
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
    <aside
      id="copiloto"
      tabIndex={-1}
      aria-label="Copiloto de IA"
      className={clsx(
        "flex shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-white lg:sticky lg:top-5 lg:h-[calc(100vh-7.5rem)]",
        open ? "w-full lg:w-[320px]" : "w-full lg:w-14"
      )}
    >
      <div className={clsx("flex items-center gap-2.5 p-3", open && "border-b border-line-soft pl-4")}>
        {open ? (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-accent" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17l6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
            </span>
            <h2 className="flex-1 text-[15px] font-semibold">Copiloto</h2>
            {sending ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-text">
                <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-accent" />
                Pensando
              </span>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Recolher copiloto" : "Abrir copiloto"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
            {open ? <path d="m8 10 2 2-2 2" /> : <path d="m10 10-2 2 2 2" />}
          </svg>
        </button>
      </div>

      <div data-testid="ai-sidebar" className={clsx("min-h-0 flex-1 flex-col", open ? "flex" : "hidden")}>
        <div data-testid="ai-messages" aria-live="polite" className="flex min-h-[240px] flex-1 flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mt-auto flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-ink-3">
                Peça em linguagem natural para criar, editar ou mover cartões. Antes de
                mudar qualquer coisa, eu mostro o plano para você aplicar.
              </p>
              <div className="flex flex-col items-start gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="min-h-9 rounded-full border border-chip bg-white px-3 text-left text-sm text-ink-3 transition hover:border-primary hover:text-ink"
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
                  className="max-w-[88%] self-end whitespace-pre-wrap rounded-xl rounded-br-[4px] bg-ink px-3 py-2.5 text-sm leading-normal text-white"
                >
                  {message.content}
                </p>
              ) : (
                <div key={index} className="flex w-full flex-col gap-2.5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{message.content}</p>
                  {message.ops && message.ops.length > 0 ? (
                    <PlanCard
                      message={message}
                      onApply={() => apply(index)}
                      onDiscard={() => update(index, { status: "discarded" })}
                      onUndo={() => undo(index)}
                      onFocusCard={(id) => onPlanFocus?.(id)}
                    />
                  ) : null}
                  {message.meta ? (
                    <TraceDetails meta={message.meta} rationale={explainPlan(message.ops ?? [], message.board)} />
                  ) : null}
                </div>
              )
            )
          )}
          {sending ? (
            <p data-testid="ai-loading" className="flex items-center gap-2 text-sm text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Pensando no plano…
            </p>
          ) : null}
          {error ? (
            <p data-testid="ai-error" role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-line-soft px-4 pb-4 pt-3">
          <label htmlFor="ai-input" className="sr-only">
            Pedido ao copiloto
          </label>
          <div className="flex items-end gap-2 rounded-xl border border-field bg-white py-2 pl-3 pr-2 transition focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
            <textarea
              id="ai-input"
              data-testid="ai-input"
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Peça para criar, editar ou mover cartões…"
              disabled={sending}
              className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-normal text-ink outline-none placeholder:text-muted disabled:opacity-60"
            />
            <button
              data-testid="ai-send"
              type="submit"
              aria-label="Enviar pedido"
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-secondary text-white transition hover:bg-secondary-hover disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted">Enter envia · Shift+Enter quebra a linha</p>
        </form>
      </div>
    </aside>
  );
};
