import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";
import { dndCardId, dndColumnId } from "@/lib/kanban";

type KanbanColumnProps = {
  column: Column;
  color: string;
  cards: Card[];
  totalCount: number;
  filtering: boolean;
  dragging: boolean;
  aiTouched: Record<string, string>;
  planIds: string[];
  planFocusId: string | null;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (cardId: string) => void;
  onSaveCard: (cardId: string, title: string, details: string) => void;
};

export const KanbanColumn = ({
  column,
  color,
  cards,
  totalCount,
  filtering,
  dragging,
  aiTouched,
  planIds,
  planFocusId,
  onRename,
  onAddCard,
  onDeleteCard,
  onSaveCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: dndColumnId(column.id) });
  const [draft, setDraft] = useState<string | null>(null);
  const headingId = `column-heading-${column.id}`;

  const handleChange = (value: string) => {
    setDraft(value);
    if (value.trim()) {
      onRename(column.id, value);
    }
  };

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={clsx(
        "flex min-h-[520px] flex-col gap-2 rounded-[14px] p-2.5 transition-colors",
        isOver ? "bg-accent-soft ring-[1.5px] ring-accent" : "bg-well"
      )}
      data-testid={`column-${column.id}`}
    >
      <h2 id={headingId} className="sr-only">
        {column.title}, {totalCount} cartões
      </h2>
      <div className="flex items-center gap-1.5 px-1 pb-1 pt-0.5">
        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden="true" />
        <label className="flex min-w-0 flex-1 items-center">
          <span className="sr-only">Nome da coluna</span>
          <input
            value={draft ?? column.title}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={() => setDraft(null)}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            title="Clique para renomear a etapa"
            className="w-full min-w-0 rounded-md bg-transparent cursor-text px-1.5 py-1 text-sm font-semibold outline-none transition hover:bg-white/80 focus:bg-white focus:ring-2 focus:ring-primary"
          />
        </label>
        <span className="tabular min-w-[26px] shrink-0 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-center text-xs">
          {filtering ? `${cards.length}/${totalCount}` : totalCount}
        </span>
      </div>
      {draft !== null && !draft.trim() ? (
        <p className="px-1.5 text-xs text-danger">
          O nome não pode ficar vazio. Ao sair, volta para “{column.title}”.
        </p>
      ) : null}
      <SortableContext items={column.cardIds.map(dndCardId)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            aiLabel={aiTouched[card.id]}
            inPlan={planIds.includes(card.id)}
            planFocus={planFocusId === card.id}
            onDelete={onDeleteCard}
            onSave={onSaveCard}
          />
        ))}
      </SortableContext>
      {dragging && (isOver || cards.length === 0) ? (
        <div
          className={clsx(
            "flex h-16 items-center justify-center rounded-[10px] border-[1.5px] border-dashed text-xs font-medium",
            isOver ? "border-accent bg-white/60 text-accent-text" : "border-stage-1 text-muted"
          )}
        >
          Solte aqui
        </div>
      ) : null}
      {!dragging && cards.length === 0 && !filtering ? (
        <p className="px-2 py-3 text-xs text-muted">Nenhum cartão nesta etapa.</p>
      ) : null}
      <NewCardForm onAdd={(title, details) => onAddCard(column.id, title, details)} />
    </section>
  );
};
