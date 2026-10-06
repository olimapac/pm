import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiTraceTerminal } from "@/components/AiTraceTerminal";

const meta = {
  model: "openai/gpt-4o-mini",
  duration_ms: 2340,
  usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
  trace: [
    { step: "load_board", detail: "Snapshot do board #1", duration_ms: 1 },
    { step: "llm_call", detail: "POST espera da LLM", duration_ms: 2300 },
  ],
  prompt: {
    instructions: "You manage a Kanban board.",
    board_json: '{"id":1}',
    input: "user: create X",
  },
};

describe("AiTraceTerminal", () => {
  it("shows an empty-state hint when nothing ran yet", () => {
    render(<AiTraceTerminal blocks={[]} onClear={() => {}} />);
    expect(screen.getByTestId("ai-trace")).toBeVisible();
    expect(screen.getByText(/aparece aqui passo a passo/)).toBeVisible();
  });

  it("renders steps, timing and token totals for a finished call", () => {
    render(
      <AiTraceTerminal
        blocks={[
          {
            id: 1,
            message: "create X",
            status: "ok",
            startedAt: new Date(),
            clientMs: 2500,
            meta,
          },
        ]}
        onClear={() => {}}
      />
    );
    expect(screen.getByTestId("ai-trace-block")).toBeVisible();
    expect(screen.getByText(/Snapshot do board/)).toBeVisible();
    expect(screen.getByText(/user: create X/)).toBeVisible();
    expect(screen.queryByText(/You manage a Kanban board/)).toBeNull();
    expect(screen.getByText(/in=100 out=20 total=120 tokens/)).toBeVisible();
  });

  it("renders errors with the failure reason", () => {
    render(
      <AiTraceTerminal
        blocks={[
          {
            id: 1,
            message: "hi",
            status: "error",
            startedAt: new Date(),
            clientMs: 50,
            error: "Copiloto inacessível.",
          },
        ]}
        onClear={() => {}}
      />
    );
    expect(screen.getByText(/Copiloto inacessível/)).toBeVisible();
  });

  it("clears the trace on button click", async () => {
    const onClear = vi.fn();
    const view = render(<AiTraceTerminal blocks={[]} onClear={onClear} />);
    expect(screen.getByTestId("ai-trace-clear")).toBeDisabled();
    view.rerender(
      <AiTraceTerminal
        blocks={[
          {
            id: 1,
            message: "hi",
            status: "ok",
            startedAt: new Date(),
            clientMs: 10,
          },
        ]}
        onClear={onClear}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("ai-trace-clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
