import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  index: number;
  color: string;
  cards: Card[];
  aiTouched: Record<string, string>;
  selectedId: string | null;
  onSelect: (cardId: string | null) => void;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (cardId: string) => void;
  onSaveCard: (cardId: string, title: string, details: string) => void;
};

export const KanbanColumn = ({
  column,
  index,
  color,
  cards,
  aiTouched,
  selectedId,
  onSelect,
  onRename,
  onAddCard,
  onDeleteCard,
  onSaveCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[560px] flex-col gap-2 rounded-[14px] p-2.5 transition-colors",
        isOver ? "bg-accent-soft ring-[1.5px] ring-accent" : "bg-well"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center gap-2 px-1 pb-1.5 pt-1">
        <span className="font-mono text-[11px] text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="h-2 w-2 rounded-[2px]" style={{ background: color }} aria-hidden="true" />
        <input
          value={column.title}
          onChange={(event) => onRename(column.id, event.target.value)}
          className="min-w-0 flex-1 rounded-md bg-transparent px-0.5 py-1 text-sm font-semibold outline-none focus:bg-white"
          aria-label="Nome da coluna"
        />
        <span className="min-w-[22px] rounded-full bg-white px-1.5 py-0.5 text-center font-mono text-[11px]">
          {cards.length}
        </span>
      </div>
      <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            aiLabel={aiTouched[card.id]}
            selected={selectedId === card.id}
            onSelect={onSelect}
            onDelete={onDeleteCard}
            onSave={onSaveCard}
          />
        ))}
      </SortableContext>
      {isOver || cards.length === 0 ? (
        <div
          className={clsx(
            "flex h-16 items-center justify-center rounded-[10px] border-[1.5px] border-dashed text-xs font-medium",
            isOver ? "border-accent bg-white/60 text-accent-text" : "border-[#c9d1dc] text-muted"
          )}
        >
          Solte aqui
        </div>
      ) : null}
      <NewCardForm onAdd={(title, details) => onAddCard(column.id, title, details)} />
    </section>
  );
};
