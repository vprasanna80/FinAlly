import type { ChatActions, Portfolio, Snapshot, Trade, WatchlistItem } from "./types";

class ApiError extends Error {}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { detail?: string });
    throw new ApiError(body.detail ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getPortfolio: () => request<Portfolio>("/api/portfolio"),

  getHistory: () => request<{ snapshots: Snapshot[] }>("/api/portfolio/history"),

  trade: (ticker: string, quantity: number, side: "buy" | "sell") =>
    request<{ trade: Trade; portfolio: Portfolio }>("/api/portfolio/trade", {
      method: "POST",
      body: JSON.stringify({ ticker, quantity, side }),
    }),

  getWatchlist: () => request<{ watchlist: WatchlistItem[] }>("/api/watchlist"),

  addTicker: (ticker: string) =>
    request<{ ticker: string }>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ ticker }),
    }),

  removeTicker: (ticker: string) =>
    request<{ ticker: string }>(`/api/watchlist/${encodeURIComponent(ticker)}`, {
      method: "DELETE",
    }),

  sendChat: (message: string) =>
    request<{ message: string; actions: ChatActions }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

export { ApiError };
