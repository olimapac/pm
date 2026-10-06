"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import * as api from "@/lib/api";
import { fromDnd, type BoardData } from "@/lib/kanban";

export const UNDO_MS = 5000;

const COLUMN_COLORS = [
  "var(--color-stage-1)",
  "var(--color-stage-2)",
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-accent)",
];

type PendingDelete = { cardId: string; title: string; timer: ReturnType<typeof setTimeout> };

type KanbanBoardProps = {
  refreshSignal?: number;
  query?: string;
  onClearQuery?: () => void;
  aiTouched?: Record<string, string>;
  planIds?: string[];
  planFocusId?: string | null;
};

const BoardSkeleton = () => (
  <div className="flex flex-col gap-5" aria-busy="true">
    <p className="sr-only">Carregando o quadro…</p>
    <div className="h-9 w-56 animate-pulse rounded-lg bg-well" />
    <div className="grid grid-cols-[repeat(5,minmax(168px,1fr))] gap-3 overflow-hidden">
      {[3, 1, 2, 2, 2].map((n, i) => (
        <div key={i} className="flex min-h-[520px] flex-col gap-2 rounded-[14px] bg-well p-2.5">
          <div className="h-6 w-2/3 rounded-md bg-white/60" />
          {Array.from({ length: n }, (_, j) => (
            <div key={j} className="h-20 animate-pulse rounded-[10px] bg-white/70" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const KanbanBoard = ({
  refreshSignal = 0,
  query = "",
  onClearQuery,
  aiTouched = {},
  planIds = [],
  planFocusId = null,
}: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const renameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = async () => {
    try {
      setError(null);
      setBoard(await api.fetchBoard());
    } catch {
      setError("Não consegui carregar o quadro. Verifique se o servidor está no ar e tente de novo.");
    }
  };

  useEffect(() => {
    load();
  }, [refreshSignal]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      await load();
    } catch {
      setError(message);
    }
  };

  const commitDelete = (pending: PendingDelete) => {
    clearTimeout(pending.timer);
    setPendingDelete(null);
    run(() => api.deleteCard(pending.cardId), "Não consegui remover o cartão. Tente de novo.");
  };

  const handleDelete = (cardId: string) => {
    if (pendingDelete) {
      commitDelete(pendingDelete);
    }
    const pending: PendingDelete = {
      cardId,
      title: board?.cards[cardId]?.title ?? "",
      timer: setTimeout(() => commitDelete(pending), UNDO_MS),
    };
    setPendingDelete(pending);
  };

  const undoDelete = () => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      setPendingDelete(null);
    }
  };

  const columnOf = (id: UniqueIdentifier) =>
    String(id).startsWith("col-")
      ? board?.columns.find((c) => c.id === fromDnd(id))
      : board?.columns.find((c) => c.cardIds.includes(fromDnd(id)));

  const cardTitle = (id: UniqueIdentifier) => board?.cards[fromDnd(id)]?.title ?? "cartão";

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Cartão “${cardTitle(active.id)}” pego.`,
    onDragOver: ({ active, over }) =>
      over
        ? `“${cardTitle(active.id)}” sobre a coluna ${columnOf(over.id)?.title}.`
        : `“${cardTitle(active.id)}” fora de uma coluna.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `“${cardTitle(active.id)}” solto em ${columnOf(over.id)?.title}.`
        : `“${cardTitle(active.id)}” voltou ao lugar.`,
    onDragCancel: ({ active }) => `Movimento de “${cardTitle(active.id)}” cancelado.`,
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(fromDnd(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || !board || active.id === over.id) {
      return;
    }

    const activeId = fromDnd(active.id);
    const targetColumn = columnOf(over.id);
    if (!targetColumn) {
      return;
    }
    const toPosition = String(over.id).startsWith("col-")
      ? targetColumn.cardIds.length
      : targetColumn.cardIds.indexOf(fromDnd(over.id));

    await run(
      () => api.moveCardTo(activeId, targetColumn.id, toPosition),
      "Não consegui mover o cartão. Tente de novo."
    );
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.map((column) =>
              column.id === columnId ? { ...column, title } : column
            ),
          }
        : prev
    );
    if (renameTimer.current) {
      clearTimeout(renameTimer.current);
    }
    renameTimer.current = setTimeout(() => {
      api.renameColumn(columnId, title).catch(() => {
        setError("Não consegui renomear a coluna. Recarregue a página para sincronizar.");
      });
    }, 400);
  };

  if (error && !board) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p role="alert" className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={load}
          className="min-h-10 rounded-[10px] bg-secondary px-4 text-sm font-semibold text-white hover:bg-secondary-hover"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!board) {
    return <BoardSkeleton />;
  }

  const q = query.trim().toLowerCase();
  const visible = (id: string) => {
    const card = board.cards[id];
    return id !== pendingDelete?.cardId && (!q || `${card.title} ${card.details}`.toLowerCase().includes(q));
  };
  const total = Object.keys(board.cards).length;
  const lastColumn = board.columns.at(-1);
  const doneCount = lastColumn?.cardIds.length ?? 0;
  const matchCount = board.columns.reduce((n, c) => n + c.cardIds.filter(visible).length, 0);
  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const colorOf = (i: number) => COLUMN_COLORS[i % COLUMN_COLORS.length];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{board.title}</h1>

        <div className="flex min-w-[280px] flex-[0_1_440px] flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm text-ink-3">
            <span>
              <strong className="font-semibold text-ink">
                {doneCount} de {total}
              </strong>{" "}
              cartões em {lastColumn?.title}
            </span>
            <span className="tabular text-sm font-semibold text-ink">
              {total ? Math.round((doneCount / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex h-2 gap-[3px]" role="img" aria-label="Distribuição de cartões por etapa">
            {board.columns.map((column, i) => (
              <span
                key={column.id}
                title={`${column.title}: ${column.cardIds.length}`}
                className="rounded-[3px]"
                style={{ flex: `${column.cardIds.length} 1 0`, background: colorOf(i) }}
              />
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <div role="alert" className="flex items-center gap-3 rounded-[10px] bg-danger-soft py-1.5 pl-3 pr-1.5 text-sm text-danger">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="min-h-8 rounded-md px-2.5 text-xs font-semibold transition hover:bg-white/60"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {q && matchCount === 0 ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-white px-4 py-3 text-sm">
          <span className="text-ink-3">
            Nenhum cartão encontrado para <strong className="font-semibold text-ink">“{query.trim()}”</strong>.
          </span>
          <button
            type="button"
            onClick={onClearQuery}
            className="min-h-8 rounded-md px-2.5 text-sm font-medium text-primary-text transition hover:bg-primary-soft"
          >
            Limpar busca
          </button>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCardId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Para mover um cartão, pressione espaço ou Enter na alça. Use as setas para escolher o destino e espaço ou Enter para soltar. Esc cancela.",
          },
        }}
      >
        <div className="-mx-1 overflow-x-auto px-1 pb-2 pt-1">
          <div className="grid grid-cols-[repeat(5,minmax(168px,1fr))] items-start gap-3">
            {board.columns.map((column, i) => {
              const cardIds = column.cardIds.filter(visible);
              return (
                <KanbanColumn
                  key={column.id}
                  column={{ ...column, cardIds }}
                  color={colorOf(i)}
                  cards={cardIds.map((id) => board.cards[id])}
                  totalCount={column.cardIds.filter((id) => id !== pendingDelete?.cardId).length}
                  filtering={Boolean(q)}
                  dragging={activeCardId !== null}
                  aiTouched={aiTouched}
                  planIds={planIds}
                  planFocusId={planFocusId}
                  onRename={handleRenameColumn}
                  onAddCard={(columnId, title, details) =>
                    run(() => api.createCard(columnId, title, details), "Não consegui adicionar o cartão. Tente de novo.")
                  }
                  onDeleteCard={handleDelete}
                  onSaveCard={(cardId, title, details) =>
                    run(() => api.updateCard(cardId, title, details), "Não consegui salvar o cartão. Tente de novo.")
                  }
                />
              );
            })}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCardPreview card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {pendingDelete ? (
        <div
          key={pendingDelete.cardId}
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-xl bg-ink text-sm text-white shadow-[0_12px_32px_rgba(3,33,71,0.28)]"
        >
          <div className="flex items-center gap-4 py-2 pl-4 pr-2">
            <span>“{pendingDelete.title}” removido.</span>
            <button
              type="button"
              onClick={undoDelete}
              autoFocus
              className="min-h-9 rounded-lg px-3 font-semibold text-accent transition hover:bg-white/10"
            >
              Desfazer
            </button>
          </div>
          <div
            className="countdown h-0.5 origin-left bg-accent"
            style={{ animationDuration: `${UNDO_MS}ms` }}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
};
