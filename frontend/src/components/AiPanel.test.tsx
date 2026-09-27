import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiPanel } from "@/components/AiPanel";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

describe("AiPanel", () => {
  it("records a trace block with tokens when a chat call finishes", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "created",
        applied: true,
        board: {},
        meta: {
          model: "openai/gpt-4o-mini",
          duration_ms: 2340,
          usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
          trace: [
            { step: "llm_call", detail: "espera da LLM", duration_ms: 2300 },
          ],
          prompt: {
            instructions: "You manage a Kanban board.",
            board_json: '{"id":1}',
            input: "user: create X",
          },
        },
      }),
    });
    const onApplied = vi.fn();
    render(<AiPanel onApplied={onApplied} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("ai-input"), "create X");
    await user.click(screen.getByTestId("ai-send"));
    expect(await screen.findByText("created")).toBeVisible();
    expect(await screen.findByTestId("ai-trace-block")).toBeVisible();
    expect(screen.getByText(/espera da LLM/)).toBeVisible();
    expect(screen.getByText(/user: create X/)).toBeVisible();
    expect(screen.queryByText(/You manage a Kanban board/)).toBeNull();
    expect(screen.getByText(/in=100 out=20 total=120 tokens/)).toBeVisible();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("records an error block when the assistant is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    render(<AiPanel onApplied={() => {}} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("ai-input"), "hi");
    await user.click(screen.getByTestId("ai-send"));
    expect(await screen.findByTestId("ai-error")).toBeVisible();
    const block = await screen.findByTestId("ai-trace-block");
    expect(block).toBeVisible();
    expect(within(block).getByText(/Could not reach/)).toBeVisible();
  });
});
