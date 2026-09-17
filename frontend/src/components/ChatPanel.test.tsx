import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "@/lib/types";

describe("ChatPanel", () => {
  it("shows a placeholder when there are no messages", () => {
    render(<ChatPanel messages={[]} loading={false} onSend={vi.fn()} />);
    expect(screen.getByText(/ask finally/i)).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "buy 5 AAPL" },
      { id: "2", role: "assistant", content: "Done." },
    ];
    render(<ChatPanel messages={messages} loading={false} onSend={vi.fn()} />);
    expect(screen.getByText("buy 5 AAPL")).toBeInTheDocument();
    expect(screen.getByText("Done.")).toBeInTheDocument();
  });

  it("renders inline trade and watchlist confirmations from actions", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "assistant",
        content: "Executed.",
        actions: {
          trades: [{ id: "t1", ticker: "AAPL", side: "buy", quantity: 5, price: 190, executed_at: "now" }],
          watchlist_changes: [{ ticker: "PYPL", action: "add" }],
          errors: ["Insufficient cash for TSLA"],
        },
      },
    ];
    render(<ChatPanel messages={messages} loading={false} onSend={vi.fn()} />);
    expect(screen.getByText(/Bought 5 AAPL/)).toBeInTheDocument();
    expect(screen.getByText(/Added PYPL/)).toBeInTheDocument();
    expect(screen.getByText(/Insufficient cash for TSLA/)).toBeInTheDocument();
  });

  it("shows a loading indicator while waiting for a response", () => {
    render(<ChatPanel messages={[]} loading={true} onSend={vi.fn()} />);
    expect(screen.getByTestId("chat-loading")).toBeInTheDocument();
  });

  it("submits the typed message and clears the input", () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} loading={false} onSend={onSend} />);
    const input = screen.getByLabelText("Chat message") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "how is my portfolio doing?" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).toHaveBeenCalledWith("how is my portfolio doing?");
    expect(input.value).toBe("");
  });

  it("does not submit an empty message", () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} loading={false} onSend={onSend} />);
    const input = screen.getByLabelText("Chat message");
    fireEvent.submit(input.closest("form")!);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("collapses and expands", () => {
    render(<ChatPanel messages={[]} loading={false} onSend={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Collapse chat panel"));
    expect(screen.getByLabelText("Expand chat panel")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Expand chat panel"));
    expect(screen.getByLabelText("Collapse chat panel")).toBeInTheDocument();
  });
});
