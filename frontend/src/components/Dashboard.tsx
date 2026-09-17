"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "./Header";
import { WatchlistPanel } from "./WatchlistPanel";
import { MainChart } from "./MainChart";
import { PortfolioHeatmap } from "./PortfolioHeatmap";
import { PnLChart } from "./PnLChart";
import { PositionsTable } from "./PositionsTable";
import { TradeBar } from "./TradeBar";
import { ChatPanel } from "./ChatPanel";
import { usePriceStream } from "@/lib/usePriceStream";
import { api, ApiError } from "@/lib/api";
import type { ChatMessage, Portfolio, Snapshot, WatchlistItem } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

export function Dashboard() {
  const { prices, history, status } = usePriceStream();

  const [tickers, setTickers] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const refreshWatchlist = useCallback(async () => {
    const { watchlist } = await api.getWatchlist();
    setTickers(watchlist.map((w) => w.ticker));
  }, []);

  const refreshPortfolio = useCallback(async () => {
    const [portfolioData, historyData] = await Promise.all([api.getPortfolio(), api.getHistory()]);
    setPortfolio(portfolioData);
    setSnapshots(historyData.snapshots);
  }, []);

  useEffect(() => {
    refreshWatchlist();
    refreshPortfolio();
  }, [refreshWatchlist, refreshPortfolio]);

  useEffect(() => {
    const interval = setInterval(refreshPortfolio, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshPortfolio]);

  useEffect(() => {
    if (!selectedTicker && tickers.length > 0) {
      setSelectedTicker(tickers[0]);
    }
  }, [tickers, selectedTicker]);

  const watchlistItems: WatchlistItem[] = tickers.map((ticker) => ({
    ...prices[ticker],
    ticker,
  }));

  const handleAddTicker = async (ticker: string) => {
    try {
      await api.addTicker(ticker);
      await refreshWatchlist();
    } catch {
      // ignore duplicate/invalid ticker errors — watchlist state just won't change
    }
  };

  const handleRemoveTicker = async (ticker: string) => {
    try {
      await api.removeTicker(ticker);
      await refreshWatchlist();
      setSelectedTicker((current) => (current === ticker ? null : current));
    } catch {
      // ignore
    }
  };

  const handleTrade = async (ticker: string, quantity: number, side: "buy" | "sell") => {
    setTradeError(null);
    try {
      const result = await api.trade(ticker, quantity, side);
      setPortfolio(result.portfolio);
      const historyData = await api.getHistory();
      setSnapshots(historyData.snapshots);
    } catch (err) {
      setTradeError(err instanceof ApiError ? err.message : "Trade failed");
      setTimeout(() => setTradeError(null), 4000);
    }
  };

  const handleSendChat = async (message: string) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);
    try {
      const response = await api.sendChat(message);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message,
        actions: response.actions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (response.actions.trades.length > 0 || response.actions.watchlist_changes.length > 0) {
        await Promise.all([refreshWatchlist(), refreshPortfolio()]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header portfolio={portfolio} status={status} />

      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <div className="hidden h-full w-72 flex-shrink-0 md:block">
          <WatchlistPanel
            items={watchlistItems}
            history={history}
            selected={selectedTicker}
            onSelect={setSelectedTicker}
            onRemove={handleRemoveTicker}
            onAdd={handleAddTicker}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            <MainChart ticker={selectedTicker} history={selectedTicker ? (history[selectedTicker] ?? []) : []} />
            <PortfolioHeatmap positions={portfolio?.positions ?? []} />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            <PnLChart snapshots={snapshots} />
            <PositionsTable positions={portfolio?.positions ?? []} />
          </div>
          <TradeBar defaultTicker={selectedTicker} onTrade={handleTrade} error={tradeError} />
        </div>

        <div className="h-full flex-shrink-0">
          <ChatPanel messages={messages} loading={chatLoading} onSend={handleSendChat} />
        </div>
      </div>
    </div>
  );
}
