import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import { api } from "@/lib/api";
import type { Portfolio } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  api: {
    getWatchlist: vi.fn(),
    getPortfolio: vi.fn(),
    getHistory: vi.fn(),
    addTicker: vi.fn(),
    removeTicker: vi.fn(),
    trade: vi.fn(),
    sendChat: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const emptyPortfolio: Portfolio = {
  cash_balance: 10000,
  positions: [],
  positions_value: 0,
  total_value: 10000,
};

function mockedApi() {
  return api as unknown as {
    getWatchlist: ReturnType<typeof vi.fn>;
    getPortfolio: ReturnType<typeof vi.fn>;
    getHistory: ReturnType<typeof vi.fn>;
    addTicker: ReturnType<typeof vi.fn>;
    removeTicker: ReturnType<typeof vi.fn>;
    trade: ReturnType<typeof vi.fn>;
    sendChat: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  const mocked = mockedApi();
  mocked.getWatchlist.mockResolvedValue({ watchlist: [{ ticker: "AAPL" }, { ticker: "TSLA" }] });
  mocked.getPortfolio.mockResolvedValue(emptyPortfolio);
  mocked.getHistory.mockResolvedValue({ snapshots: [] });
  mocked.addTicker.mockResolvedValue({ ticker: "PYPL" });
  mocked.removeTicker.mockResolvedValue({ ticker: "TSLA" });
  mocked.trade.mockResolvedValue({
    trade: { id: "1", ticker: "AAPL", side: "buy", quantity: 1, price: 100, executed_at: "now" },
    portfolio: {
      cash_balance: 9900,
      positions_value: 100,
      total_value: 10000,
      positions: [
        {
          ticker: "AAPL",
          quantity: 1,
          avg_cost: 100,
          current_price: 100,
          market_value: 100,
          unrealized_pnl: 0,
          unrealized_pnl_pct: 0,
        },
      ],
    },
  });
  mocked.sendChat.mockResolvedValue({
    message: "Buying 1 share of AAPL.",
    actions: { trades: [], watchlist_changes: [], errors: [] },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard", () => {
  it("loads and displays the watchlist and portfolio", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    expect(mockedApi().getPortfolio).toHaveBeenCalled();
  });

  it("adds a ticker to the watchlist", async () => {
    const mocked = mockedApi();
    render(<Dashboard />);
    await screen.findByText("AAPL");

    mocked.getWatchlist.mockResolvedValue({
      watchlist: [{ ticker: "AAPL" }, { ticker: "TSLA" }, { ticker: "PYPL" }],
    });

    const input = screen.getByLabelText("Add ticker to watchlist");
    fireEvent.change(input, { target: { value: "pypl" } });
    fireEvent.submit(input.closest("form")!);

    expect(mocked.addTicker).toHaveBeenCalledWith("PYPL");
    expect(await screen.findByText("PYPL")).toBeInTheDocument();
  });

  it("removes a ticker from the watchlist", async () => {
    const mocked = mockedApi();
    render(<Dashboard />);
    await screen.findByText("TSLA");

    mocked.getWatchlist.mockResolvedValue({ watchlist: [{ ticker: "AAPL" }] });

    fireEvent.click(screen.getByLabelText("Remove TSLA"));

    expect(mocked.removeTicker).toHaveBeenCalledWith("TSLA");
    await waitFor(() => expect(screen.queryByText("TSLA")).not.toBeInTheDocument());
  });

  it("executes a buy trade from the trade bar and refreshes the portfolio", async () => {
    const mocked = mockedApi();
    render(<Dashboard />);
    await screen.findByText("AAPL");

    fireEvent.change(screen.getByLabelText("Trade ticker"), { target: { value: "AAPL" } });
    fireEvent.change(screen.getByLabelText("Trade quantity"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Buy"));

    await waitFor(() => expect(mocked.trade).toHaveBeenCalledWith("AAPL", 1, "buy"));
    expect(await screen.findByTestId("position-AAPL")).toBeInTheDocument();
  });

  it("sends a chat message, shows loading, then renders the response", async () => {
    render(<Dashboard />);
    await screen.findByText("AAPL");

    const input = screen.getByLabelText("Chat message");
    fireEvent.change(input, { target: { value: "buy 1 share of AAPL" } });

    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(await screen.findByText("buy 1 share of AAPL")).toBeInTheDocument();
    expect(await screen.findByText("Buying 1 share of AAPL.")).toBeInTheDocument();
  });
});
