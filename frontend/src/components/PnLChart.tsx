"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatTime } from "@/lib/format";
import type { Snapshot } from "@/lib/types";

interface PnLChartProps {
  snapshots: Snapshot[];
}

export function PnLChart({ snapshots }: PnLChartProps) {
  return (
    <div className="flex h-full flex-col rounded-md border border-border-muted bg-panel p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Portfolio Value
      </h2>
      <div className="min-h-0 flex-1">
        {snapshots.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshots} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
              <XAxis
                dataKey="recorded_at"
                tickFormatter={formatTime}
                stroke="var(--foreground-muted)"
                minTickGap={40}
                fontSize={11}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="var(--foreground-muted)"
                width={72}
                fontSize={11}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <Tooltip
                labelFormatter={(label) => formatTime(String(label))}
                formatter={(value) => [formatCurrency(Number(value)), "Total Value"]}
                contentStyle={{
                  background: "var(--background-elevated)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: 4,
                }}
              />
              <Line
                type="monotone"
                dataKey="total_value"
                stroke="var(--accent-yellow)"
                dot={false}
                isAnimationActive={false}
                strokeWidth={1.75}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
            Not enough history yet
          </div>
        )}
      </div>
    </div>
  );
}
