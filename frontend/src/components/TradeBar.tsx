"use client";

import { useState } from "react";

interface TradeBarProps {
  defaultTicker?: string | null;
  onTrade: (ticker: string, quantity: number, side: "buy" | "sell") => Promise<void> | void;
  error?: string | null;
}

export function TradeBar({ defaultTicker, onTrade, error }: TradeBarProps) {
  const [ticker, setTicker] = useState(defaultTicker ?? "");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (side: "buy" | "sell") => {
    const qty = Number(quantity);
    const symbol = ticker.trim().toUpperCase();
    if (!symbol || !Number.isFinite(qty) || qty <= 0) return;
    setSubmitting(true);
    try {
      await onTrade(symbol, qty, side);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-muted bg-panel p-3 sm:flex-row sm:items-center">
      <input
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Ticker"
        aria-label="Trade ticker"
        className="rounded border border-border-muted bg-elevated px-2 py-1.5 text-sm uppercase outline-none focus:border-accent-blue sm:w-28"
      />
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        type="number"
        min="0"
        step="any"
        aria-label="Trade quantity"
        className="rounded border border-border-muted bg-elevated px-2 py-1.5 text-sm outline-none focus:border-accent-blue sm:w-24"
      />
      <div className="flex gap-2">
        <button
          onClick={() => submit("buy")}
          disabled={submitting}
          className="flex-1 rounded bg-up px-4 py-1.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50 sm:flex-none"
        >
          Buy
        </button>
        <button
          onClick={() => submit("sell")}
          disabled={submitting}
          className="flex-1 rounded bg-down px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:flex-none"
        >
          Sell
        </button>
      </div>
      {error && <span className="text-xs text-down">{error}</span>}
    </div>
  );
}
