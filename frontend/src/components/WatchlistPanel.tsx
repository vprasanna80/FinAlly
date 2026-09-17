"use client";

import { useState } from "react";
import { Sparkline } from "./Sparkline";
import { formatPercent } from "@/lib/format";
import { usePriceFlash } from "@/lib/usePriceFlash";
import type { HistoryPoint } from "@/lib/usePriceStream";
import type { WatchlistItem } from "@/lib/types";

interface WatchlistPanelProps {
  items: WatchlistItem[];
  history: Record<string, HistoryPoint[]>;
  selected: string | null;
  onSelect: (ticker: string) => void;
  onRemove: (ticker: string) => void;
  onAdd: (ticker: string) => void;
}

export function WatchlistPanel({
  items,
  history,
  selected,
  onSelect,
  onRemove,
  onAdd,
}: WatchlistPanelProps) {
  const [draft, setDraft] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = draft.trim().toUpperCase();
    if (!ticker) return;
    onAdd(ticker);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col rounded-md border border-border-muted bg-panel">
      <div className="border-b border-border-muted px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Watchlist
        </h2>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 border-b border-border-muted px-3 py-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add ticker…"
          className="min-w-0 flex-1 rounded border border-border-muted bg-elevated px-2 py-1 text-sm outline-none focus:border-accent-blue"
          aria-label="Add ticker to watchlist"
        />
        <button
          type="submit"
          className="rounded bg-accent-purple px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
        >
          Add
        </button>
      </form>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-panel text-xs text-foreground-muted">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Ticker</th>
              <th className="px-3 py-1.5 text-right font-medium">Price</th>
              <th className="px-3 py-1.5 text-right font-medium">Chg %</th>
              <th className="px-3 py-1.5 text-right font-medium">Chart</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <WatchlistRow
                key={item.ticker}
                item={item}
                history={history[item.ticker] ?? []}
                isSelected={item.ticker === selected}
                onSelect={() => onSelect(item.ticker)}
                onRemove={() => onRemove(item.ticker)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface WatchlistRowProps {
  item: WatchlistItem;
  history: HistoryPoint[];
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function WatchlistRow({ item, history, isSelected, onSelect, onRemove }: WatchlistRowProps) {
  const flashClass = usePriceFlash(item.price);
  const changePct = item.change_pct ?? 0;
  const changeColor = changePct > 0 ? "text-up" : changePct < 0 ? "text-down" : "text-foreground-muted";

  return (
    <tr
      onClick={onSelect}
      data-testid={`watchlist-row-${item.ticker}`}
      className={`cursor-pointer border-b border-border-muted/50 transition-colors hover:bg-elevated ${
        isSelected ? "bg-elevated" : ""
      }`}
    >
      <td className="px-3 py-1.5 font-medium">{item.ticker}</td>
      <td className={`px-3 py-1.5 text-right font-mono ${flashClass}`}>
        {item.price !== undefined ? item.price.toFixed(2) : "—"}
      </td>
      <td className={`px-3 py-1.5 text-right font-mono ${changeColor}`}>
        {item.change_pct !== undefined ? formatPercent(changePct) : "—"}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end">
          <Sparkline values={history.map((h) => h.price)} />
        </div>
      </td>
      <td className="px-2 py-1.5 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${item.ticker}`}
          className="text-foreground-muted transition hover:text-down"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
