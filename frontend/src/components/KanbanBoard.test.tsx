import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";

const col = (id: number, title: string, cards: object[] = []) => ({
  id,
  title,
  position: 0,
  cards,
});

const card = (id: number, column_id: number, title: string) => ({
  id,
  column_id,
  title,
  details: "Details",
  position: 0,
});

const boardWith = (cards: object[]) => ({
  id: 1,
  title: "My Board",
  columns: [col(1, "Backlog", cards)],
});

const json = (payload: unknown) => ({ ok: true, json: async () => payload });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("loads columns from the API", async () => {
    fetchMock.mockResolvedValueOnce(
      json(boardWith([card(7, 1, "From API")]))
    );
    render(<KanbanBoard />);
    expect(await screen.findByTestId("column-1")).toBeVisible();
    expect(screen.getByText("From API")).toBeVisible();
  });

  it("shows an error with retry when the API is down", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    render(<KanbanBoard />);
    expect(await screen.findByText(/não consegui carregar/i)).toBeVisible();
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByTestId("column-1")).toBeVisible();
  });

  it("renames a column via PATCH", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    render(<KanbanBoard />);
    await screen.findByTestId("column-1");
    const input = within(getFirstColumn()).getByLabelText("Nome da coluna");
    fetchMock.mockResolvedValueOnce(json({}));
    await userEvent.clear(input);
    await userEvent.type(input, "Todo");
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/columns/1", {
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({ title: "Todo" }),
      });
    });
  });

  it("adds a card via the API", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    fetchMock.mockResolvedValueOnce(json({}));
    fetchMock.mockResolvedValueOnce(
      json(boardWith([card(99, 1, "New card")]))
    );
    render(<KanbanBoard />);
    await screen.findByTestId("column-1");
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /adicionar cartão/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/título do cartão/i),
      "New card"
    );
    await userEvent.click(
      within(column).getByRole("button", { name: "Adicionar" })
    );
    expect(await within(column).findByText("New card")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deletes a card via the API", async () => {
    fetchMock.mockResolvedValueOnce(
      json(boardWith([card(7, 1, "Gone soon")]))
    );
    fetchMock.mockResolvedValueOnce(json({}));
    fetchMock.mockResolvedValueOnce(json(boardWith([])));
    render(<KanbanBoard />);
    await screen.findByText("Gone soon");
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /remover gone soon/i })
    );
    expect(screen.queryByText("Gone soon", { selector: "h3" })).toBeNull();
    expect(screen.getByText(/“Gone soon” removido/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Desfazer" })).toHaveFocus();
    await vi.waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/cards/7",
          expect.objectContaining({ method: "DELETE" })
        ),
      { timeout: 7000 }
    );
  }, 10000);

  it("undoes a delete before it reaches the API", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([card(7, 1, "Keep me")])));
    render(<KanbanBoard />);
    await screen.findByText("Keep me");
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /remover keep me/i }));
    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(within(column).getByText("Keep me")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains when a search has no matches", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([card(7, 1, "Alpha")])));
    const onClear = vi.fn();
    render(<KanbanBoard query="zzz" onClearQuery={onClear} />);
    expect(await screen.findByText(/nenhum cartão encontrado/i)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("outlines the cards a pending plan will touch", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([card(7, 1, "In plan"), card(8, 1, "Other")])));
    render(<KanbanBoard planIds={["7"]} />);
    await screen.findByText("In plan");
    expect(screen.getByTestId("card-7")).toHaveClass("border-accent");
    expect(screen.getByTestId("card-8")).not.toHaveClass("border-accent");
  });

  it("opens the editor when the card body is clicked", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([card(7, 1, "Editable")])));
    render(<KanbanBoard />);
    await userEvent.click(await screen.findByRole("button", { name: "Editar Editable" }));
    expect(screen.getByLabelText("Título")).toHaveValue("Editable");
  });

  it("exposes a keyboard drag handle per card", async () => {
    fetchMock.mockResolvedValueOnce(json(boardWith([card(7, 1, "Handle")])));
    render(<KanbanBoard />);
    const handle = await screen.findByRole("button", { name: "Mover Handle" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
    expect(screen.getByTestId("card-7")).not.toHaveAttribute("role");
  });
});
