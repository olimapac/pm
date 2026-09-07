import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiSidebar } from "@/components/AiSidebar";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

const sendMessage = async (text: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByTestId("ai-input"), text);
  await user.click(screen.getByTestId("ai-send"));
};

describe("AiSidebar", () => {
  it("renders the assistant panel with an input", () => {
    render(<AiSidebar onApplied={() => {}} />);
    expect(screen.getByTestId("ai-sidebar")).toBeVisible();
    expect(screen.getByTestId("ai-input")).toBeVisible();
  });

  it("shows the reply without refreshing when nothing was applied", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "done", applied: false, board: {} }),
    });
    const onApplied = vi.fn();
    render(<AiSidebar onApplied={onApplied} />);
    await sendMessage("hi");
    expect(await screen.findByText("done")).toBeVisible();
    expect(onApplied).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/chat", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ message: "hi", history: [] }),
    });
  });

  it("notifies the board to refresh when changes were applied", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "created", applied: true, board: {} }),
    });
    const onApplied = vi.fn();
    render(<AiSidebar onApplied={onApplied} />);
    await sendMessage("create X");
    expect(await screen.findByText("created")).toBeVisible();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state while sending", async () => {
    let resolveChat!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveChat = resolve;
      })
    );
    render(<AiSidebar onApplied={() => {}} />);
    const user = userEvent.setup();
    await user.type(screen.getByTestId("ai-input"), "hi");
    const sendPromise = user.click(screen.getByTestId("ai-send"));
    expect(await screen.findByTestId("ai-loading")).toBeVisible();
    resolveChat({ ok: true, json: async () => ({ reply: "done", applied: false }) });
    await sendPromise;
    expect(await screen.findByText("done")).toBeVisible();
  });

  it("shows an error when the assistant is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    render(<AiSidebar onApplied={() => {}} />);
    await sendMessage("hi");
    expect(await screen.findByTestId("ai-error")).toBeVisible();
  });
});
