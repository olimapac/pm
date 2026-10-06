import type { ChatOp, ServerBoard } from "@/lib/api";

export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardData = {
  title: string;
  columns: Column[];
  cards: Record<string, Card>;
};

export const initialData: BoardData = {
  title: "My Board",
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    {
      id: "col-progress",
      title: "In Progress",
      cardIds: ["card-4", "card-5"],
    },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Align roadmap themes",
      details: "Draft quarterly themes with impact statements and metrics.",
    },
    "card-2": {
      id: "card-2",
      title: "Gather customer signals",
      details: "Review support tags, sales notes, and churn feedback.",
    },
    "card-3": {
      id: "card-3",
      title: "Prototype analytics view",
      details: "Sketch initial dashboard layout and key drill-downs.",
    },
    "card-4": {
      id: "card-4",
      title: "Refine status language",
      details: "Standardize column labels and tone across the board.",
    },
    "card-5": {
      id: "card-5",
      title: "Design card layout",
      details: "Add hierarchy and spacing for scanning dense lists.",
    },
    "card-6": {
      id: "card-6",
      title: "QA micro-interactions",
      details: "Verify hover, focus, and loading states.",
    },
    "card-7": {
      id: "card-7",
      title: "Ship marketing page",
      details: "Final copy approved and asset pack delivered.",
    },
    "card-8": {
      id: "card-8",
      title: "Close onboarding sprint",
      details: "Document release notes and share internally.",
    },
  },
};

const isColumnId = (columns: Column[], id: string) =>
  columns.some((column) => column.id === id);

const findColumnId = (columns: Column[], id: string) => {
  if (isColumnId(columns, id)) {
    return id;
  }
  return columns.find((column) => column.cardIds.includes(id))?.id;
};

export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const activeColumnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!activeColumnId || !overColumnId) {
    return columns;
  }

  const activeColumn = columns.find((column) => column.id === activeColumnId);
  const overColumn = columns.find((column) => column.id === overColumnId);

  if (!activeColumn || !overColumn) {
    return columns;
  }

  const isOverColumn = isColumnId(columns, overId);

  if (activeColumnId === overColumnId) {
    if (isOverColumn) {
      const nextCardIds = activeColumn.cardIds.filter(
        (cardId) => cardId !== activeId
      );
      nextCardIds.push(activeId);
      return columns.map((column) =>
        column.id === activeColumnId
          ? { ...column, cardIds: nextCardIds }
          : column
      );
    }

    const oldIndex = activeColumn.cardIds.indexOf(activeId);
    const newIndex = activeColumn.cardIds.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return columns;
    }

    const nextCardIds = [...activeColumn.cardIds];
    nextCardIds.splice(oldIndex, 1);
    nextCardIds.splice(newIndex, 0, activeId);

    return columns.map((column) =>
      column.id === activeColumnId
        ? { ...column, cardIds: nextCardIds }
        : column
    );
  }

  const activeIndex = activeColumn.cardIds.indexOf(activeId);
  if (activeIndex === -1) {
    return columns;
  }

  const nextActiveCardIds = [...activeColumn.cardIds];
  nextActiveCardIds.splice(activeIndex, 1);

  const nextOverCardIds = [...overColumn.cardIds];
  if (isOverColumn) {
    nextOverCardIds.push(activeId);
  } else {
    const overIndex = overColumn.cardIds.indexOf(overId);
    const insertIndex = overIndex === -1 ? nextOverCardIds.length : overIndex;
    nextOverCardIds.splice(insertIndex, 0, activeId);
  }

  return columns.map((column) => {
    if (column.id === activeColumnId) {
      return { ...column, cardIds: nextActiveCardIds };
    }
    if (column.id === overColumnId) {
      return { ...column, cardIds: nextOverCardIds };
    }
    return column;
  });
};

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};

// Columns and cards share numeric ids in the API, so the drag layer prefixes
// them; dnd-kit needs every draggable/droppable id to be unique.
export const dndColumnId = (id: string) => `col-${id}`;
export const dndCardId = (id: string) => `card-${id}`;
export const fromDnd = (id: string | number) => String(id).replace(/^(col|card)-/, "");

export type Restore = { index: number; columnId: number; position: number };

// Builds the ops that revert `applied` against the board snapshot taken before
// it ran. A deleted card comes back as a new card, so `restores` says where to
// move it once its new id is known.
export const invertOps = (applied: ChatOp[], before: ServerBoard) => {
  const locate = (cardId?: number) => {
    for (const column of before.columns) {
      const position = column.cards.findIndex((c) => c.id === cardId);
      if (position !== -1) {
        return { column, position, card: column.cards[position] };
      }
    }
    return null;
  };
  const ops: ChatOp[] = [];
  const restores: Restore[] = [];
  for (const op of [...applied].reverse()) {
    const found = locate(op.card_id);
    if (op.op === "create_card") {
      ops.push({ op: "delete_card", card_id: op.card_id });
    } else if (op.op === "update_card" && found) {
      ops.push({ op: "update_card", card_id: op.card_id, title: found.card.title, details: found.card.details });
    } else if (op.op === "move_card" && found) {
      ops.push({ op: "move_card", card_id: op.card_id, to_column_id: found.column.id, to_position: found.position });
    } else if (op.op === "delete_card" && found) {
      restores.push({ index: ops.length, columnId: found.column.id, position: found.position });
      ops.push({ op: "create_card", column_id: found.column.id, title: found.card.title, details: found.card.details });
    } else if (op.op === "rename_column") {
      const column = before.columns.find((c) => c.id === op.column_id);
      if (column) {
        ops.push({ op: "rename_column", column_id: column.id, title: column.title });
      }
    }
  }
  return { ops, restores };
};
