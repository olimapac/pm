import { invertOps, moveCard, type Column } from "@/lib/kanban";

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });
});

describe("invertOps", () => {
  const before = {
    id: 1,
    title: "B",
    columns: [
      {
        id: 1,
        title: "A",
        position: 0,
        cards: [
          { id: 7, column_id: 1, title: "Seven", details: "s", position: 0 },
          { id: 8, column_id: 1, title: "Eight", details: "e", position: 1 },
        ],
      },
      { id: 2, title: "Z", position: 1, cards: [] },
    ],
  };

  it("reverts each op in reverse order against the snapshot", () => {
    const { ops, restores } = invertOps(
      [
        { op: "create_card", column_id: 2, title: "New", card_id: 9 },
        { op: "move_card", card_id: 7, to_column_id: 2, to_position: 0 },
        { op: "update_card", card_id: 8, title: "Renamed" },
        { op: "delete_card", card_id: 8 },
        { op: "rename_column", column_id: 2, title: "Done" },
      ],
      before
    );
    expect(ops).toEqual([
      { op: "rename_column", column_id: 2, title: "Z" },
      { op: "create_card", column_id: 1, title: "Eight", details: "e" },
      { op: "update_card", card_id: 8, title: "Eight", details: "e" },
      { op: "move_card", card_id: 7, to_column_id: 1, to_position: 0 },
      { op: "delete_card", card_id: 9 },
    ]);
    expect(restores).toEqual([{ index: 1, columnId: 1, position: 1 }]);
  });
});
