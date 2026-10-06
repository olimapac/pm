import { useState, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  aiLabel?: string;
  selected: boolean;
  onSelect: (cardId: string | null) => void;
  onDelete: (cardId: string) => void;
  onSave: (cardId: string, title: string, details: string) => void;
};

export const AiBadge = ({ label }: { label: string }) => (
  <span className="rounded-[5px] bg-primary-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#0e5b80]">
    IA · {label}
  </span>
);

export const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#a9b3c2" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

const actionClass =
  "inline-flex min-h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-xs font-medium transition hover:bg-[#e9ecf2]";

export const KanbanCard = ({
  card,
  aiLabel,
  selected,
  onSelect,
  onDelete,
  onSave,
}: KanbanCardProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startEdit = () => {
    setTitle(card.title);
    setDetails(card.details);
    setEditing(true);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    onSave(card.id, title.trim(), details.trim());
    setEditing(false);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "overflow-hidden rounded-[10px] border bg-white transition-shadow",
        selected
          ? "border-primary shadow-[0_0_0_3px_rgba(32,157,215,0.18)]"
          : "border-line shadow-[0_1px_2px_rgba(3,33,71,0.06)]",
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-2 p-3">
          <label htmlFor={`edit-title-${card.id}`} className="sr-only">Título</label>
          <input
            id={`edit-title-${card.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-[#d5dbe4] px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-primary"
            autoFocus
          />
          <label htmlFor={`edit-details-${card.id}`} className="sr-only">Detalhes</label>
          <textarea
            id={`edit-details-${card.id}`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            className="resize-none rounded-lg border border-[#d5dbe4] px-2.5 py-1.5 text-[13px] text-ink-3 outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button type="submit" className="min-h-8 rounded-lg bg-secondary px-3 text-xs font-semibold text-white hover:bg-secondary-hover">
              Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)} className={actionClass}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(selected ? null : card.id)}
            aria-pressed={selected}
            className="flex w-full flex-col gap-1.5 p-3 text-left transition hover:bg-[#fafbfc]"
          >
            <span className="flex w-full items-center gap-1.5">
              <span className="font-mono text-[11px] text-muted">#{card.id}</span>
              {aiLabel ? <AiBadge label={aiLabel} /> : null}
              <span className="flex-1" />
              <GripIcon />
            </span>
            <h4 className="text-sm font-semibold leading-snug">{card.title}</h4>
            {card.details ? (
              <span className="text-[13px] leading-normal text-muted">{card.details}</span>
            ) : null}
          </button>
          {selected ? (
            <div className="flex gap-1 border-t border-line-soft px-2 pb-2 pt-1.5">
              <button type="button" onClick={startEdit} className={actionClass}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
                Editar
              </button>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                aria-label={`Remover ${card.title}`}
                className={clsx(actionClass, "text-danger")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
                Remover
              </button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
};
