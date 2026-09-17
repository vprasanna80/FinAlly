"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatTime } from "@/lib/format";
import type { HistoryPoint } from "@/lib/usePriceStream";

interface MainChartProps {
  ticker: string | null;
  history: HistoryPoint[];
}

export function MainChart({ ticker, history }: MainChartProps) {
  return (
    <div className="flex h-full flex-col rounded-md border border-border-muted bg-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {ticker ? `${ticker} — Price` : "Select a ticker"}
        </h2>
        {history.length > 0 && (
          <span className="font-mono text-sm">
            {formatCurrency(history[history.length - 1].price)}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {ticker && history.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                stroke="var(--foreground-muted)"
                minTickGap={40}
                fontSize={11}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="var(--foreground-muted)"
                width={64}
                fontSize={11}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                labelFormatter={(label) => formatTime(String(label))}
                formatter={(value) => [formatCurrency(Number(value)), "Price"]}
                contentStyle={{
                  background: "var(--background-elevated)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: 4,
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--accent-blue)"
                dot={false}
                isAnimationActive={false}
                strokeWidth={1.75}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
            {ticker ? "Waiting for price data…" : "Click a ticker in the watchlist"}
          </div>
        )}
      </div>
    </div>
  );
}
