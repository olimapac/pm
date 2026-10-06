import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { dndCardId, type Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  aiLabel?: string;
  inPlan: boolean;
  planFocus: boolean;
  onDelete: (cardId: string) => void;
  onSave: (cardId: string, title: string, details: string) => void;
};

export const AiBadge = ({ label }: { label: string }) => (
  <span className="self-start rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-ai-text">
    IA · {label}
  </span>
);

export const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);

const fieldClass =
  "rounded-lg border border-field px-2.5 py-1.5 outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/20";

const iconButton =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink";

export const KanbanCard = ({
  card,
  aiLabel,
  inPlan,
  planFocus,
  onDelete,
  onSave,
}: KanbanCardProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const articleRef = useRef<HTMLElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndCardId(card.id), disabled: editing });

  useEffect(() => {
    if (planFocus) {
      articleRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
  }, [planFocus]);

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
      ref={(node) => {
        setNodeRef(node);
        articleRef.current = node;
      }}
      style={style}
      className={clsx(
        "group relative overflow-hidden rounded-[10px] border bg-white transition-[border-color,box-shadow]",
        planFocus
          ? "border-accent shadow-[0_4px_14px_rgba(236,173,10,0.35)]"
          : inPlan
            ? "border-accent shadow-[0_1px_2px_rgba(3,33,71,0.06)]"
            : "border-line shadow-[0_1px_2px_rgba(3,33,71,0.06)] hover:border-field",
        isDragging && "opacity-40"
      )}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      {editing ? (
        <form
          onSubmit={handleSave}
          onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
          className="flex flex-col gap-2 p-3"
        >
          <label htmlFor={`edit-title-${card.id}`} className="text-xs font-semibold text-ink-3">Título</label>
          <input
            id={`edit-title-${card.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={clsx(fieldClass, "text-sm font-semibold")}
            autoFocus
          />
          <label htmlFor={`edit-details-${card.id}`} className="text-xs font-semibold text-ink-3">Detalhes</label>
          <textarea
            id={`edit-details-${card.id}`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            className={clsx(fieldClass, "resize-none text-sm text-ink-3")}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={!title.trim()} className="min-h-8 rounded-lg bg-secondary px-3 text-xs font-semibold text-white hover:bg-secondary-hover disabled:opacity-50">
              Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-8 rounded-md px-2.5 text-xs font-medium transition hover:bg-hover">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Editar ${card.title}`}
            title="Clique para editar"
            className="flex w-full flex-col gap-1 p-3 text-left transition hover:bg-subtle"
          >
            <span className="flex items-center gap-1.5 pr-14 text-xs text-muted">
              <span className="tabular">#{card.id}</span>
              <span className="opacity-60 transition group-hover:opacity-100">
                <PencilIcon />
              </span>
            </span>
            <h3 className="text-sm font-semibold leading-snug">{card.title}</h3>
            {card.details ? (
              <span className="text-sm leading-normal text-muted">{card.details}</span>
            ) : null}
            {aiLabel ? <AiBadge label={aiLabel} /> : null}
          </button>
          <div className="absolute right-1.5 top-1.5 flex items-center">
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              aria-label={`Remover ${card.title}`}
              title="Remover"
              className={clsx(
                iconButton,
                "opacity-0 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
            </button>
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              aria-label={`Mover ${card.title}`}
              title="Arraste, ou use espaço e setas"
              className={clsx(iconButton, "cursor-grab active:cursor-grabbing")}
            >
              <GripIcon />
            </button>
          </div>
        </>
      )}
    </article>
  );
};
