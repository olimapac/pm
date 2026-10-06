import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiPanel } from "@/components/AiPanel";

const board = {
  id: 1,
  title: "Meu quadro",
  columns: [
    { id: 1, title: "Backlog", position: 0, cards: [{ id: 7, column_id: 1, title: "Old", details: "d", position: 0 }] },
    { id: 2, title: "Concluído", position: 1, cards: [] },
  ],
};

const meta = {
  model: "openai/gpt-4o-mini",
  duration_ms: 2340,
  usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
  trace: [{ step: "llm_call", detail: "espera da LLM", duration_ms: 2300 }],
  prompt: { instructions: "You manage a Kanban board.", board_json: "{}", input: "user: move it" },
};

const json = (payload: unknown) => ({ ok: true, json: async () => payload });
const moveOp = { op: "move_card", card_id: 7, to_column_id: 2, to_position: 0 };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

const renderPanel = () => {
  const onChanged = vi.fn();
  const onPlanChange = vi.fn();
  render(<AiPanel open onToggle={() => {}} onChanged={onChanged} onPlanChange={onPlanChange} />);
  return { onChanged, onPlanChange, user: userEvent.setup() };
};

const ask = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(screen.getByTestId("ai-input"), text);
  await user.click(screen.getByTestId("ai-send"));
};

describe("AiPanel", () => {
  it("shows a plan and changes nothing until it is applied", async () => {
    fetchMock.mockResolvedValueOnce(json({ reply: "Posso mover.", board, ops: [moveOp], meta }));
    const { onChanged, onPlanChange, user } = renderPanel();
    await ask(user, "move it");
    expect(await screen.findByText("Posso mover.")).toBeVisible();
    expect(onPlanChange).toHaveBeenLastCalledWith(["7"]);
    expect(screen.getByText("“Old” para Concluído")).toBeVisible();
    expect(screen.getByText(/Nada mudou ainda/)).toBeVisible();
    expect(onChanged).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(json({ board, ops: [moveOp] }));
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(await screen.findByText(/1 alteração aplicada/)).toBeVisible();
    expect(onChanged).toHaveBeenCalledWith([moveOp], false);
    expect(onPlanChange).toHaveBeenLastCalledWith([]);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/ai/apply", expect.objectContaining({
      body: JSON.stringify({ ops: [moveOp] }),
    }));
  });

  it("undoes an applied plan with the inverse ops", async () => {
    fetchMock.mockResolvedValueOnce(json({ reply: "ok", board, ops: [moveOp] }));
    const { onChanged, user } = renderPanel();
    await ask(user, "move it");
    fetchMock.mockResolvedValueOnce(json({ board, ops: [moveOp] }));
    await user.click(await screen.findByRole("button", { name: "Aplicar" }));
    fetchMock.mockResolvedValueOnce(json({ board, ops: [] }));
    await user.click(await screen.findByRole("button", { name: "Desfazer" }));
    expect(await screen.findByText(/Alterações desfeitas/)).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/ai/apply", expect.objectContaining({
      body: JSON.stringify({ ops: [{ op: "move_card", card_id: 7, to_column_id: 1, to_position: 0 }] }),
    }));
    expect(onChanged).toHaveBeenLastCalledWith([moveOp], true);
  });

  it("discards a plan without calling apply", async () => {
    fetchMock.mockResolvedValueOnce(json({ reply: "ok", board, ops: [moveOp] }));
    const { user } = renderPanel();
    await ask(user, "move it");
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    expect(screen.getByText(/Plano descartado/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows no plan for a plain answer and keeps the trace collapsed", async () => {
    fetchMock.mockResolvedValueOnce(json({ reply: "Só respondendo.", board, ops: [], meta }));
    const { user } = renderPanel();
    await ask(user, "hi");
    expect(await screen.findByText("Só respondendo.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull();
    const trace = screen.getByTestId("ai-trace");
    expect(trace).not.toHaveAttribute("open");
    await user.click(within(trace).getByText("Como cheguei aqui"));
    expect(within(trace).getByText(/Nenhuma mudança no quadro era necessária/)).toBeVisible();
    expect(within(trace).getByText("Modelo pensando").closest("li")).toHaveAttribute("title", "espera da LLM");
    expect(within(trace).getByText("user: move it")).toBeVisible();
    expect(screen.queryByText(/You manage a Kanban board/)).toBeNull();
  });

  it("puts the request back in the input when the copilot is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    const { user } = renderPanel();
    await ask(user, "hi there");
    expect(await screen.findByTestId("ai-error")).toBeVisible();
    expect(screen.getByTestId("ai-input")).toHaveValue("hi there");
  });

  it("shows a loading state while waiting for the plan", async () => {
    let resolveChat!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (resolveChat = resolve)));
    const { user } = renderPanel();
    await user.type(screen.getByTestId("ai-input"), "hi");
    const sent = user.click(screen.getByTestId("ai-send"));
    expect(await screen.findByTestId("ai-loading")).toBeVisible();
    resolveChat(json({ reply: "done", ops: [] }));
    await sent;
    expect(await screen.findByText("done")).toBeVisible();
  });
});
