"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { formatPercent } from "@/lib/format";
import type { Position } from "@/lib/types";

interface PortfolioHeatmapProps {
  positions: Position[];
}

interface HeatmapNode {
  name: string;
  size: number;
  pnlPct: number;
  [key: string]: string | number;
}

function pnlColor(pnlPct: number): string {
  const clamped = Math.max(-10, Math.min(10, pnlPct));
  const intensity = Math.abs(clamped) / 10; // 0..1
  const lightness = 28 + intensity * 12;
  return clamped >= 0 ? `hsl(154, 62%, ${lightness}%)` : `hsl(356, 72%, ${lightness}%)`;
}

function CellContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  pnlPct?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", pnlPct = 0 } = props;
  if (width < 2 || height < 2) return null;
  const showText = width > 44 && height > 28;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill: pnlColor(pnlPct), stroke: "var(--background-panel)", strokeWidth: 2 }}
      />
      {showText && (
        <>
          <text x={x + 6} y={y + 18} fontSize={12} fill="#fff" fontWeight={600}>
            {name}
          </text>
          <text x={x + 6} y={y + 34} fontSize={11} fill="rgba(255,255,255,0.85)">
            {formatPercent(pnlPct)}
          </text>
        </>
      )}
    </g>
  );
}

export function PortfolioHeatmap({ positions }: PortfolioHeatmapProps) {
  const data: HeatmapNode[] = positions.map((p) => ({
    name: p.ticker,
    size: Math.max(p.market_value, 0.01),
    pnlPct: p.unrealized_pnl_pct,
  }));

  return (
    <div className="flex h-full flex-col rounded-md border border-border-muted bg-panel p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Portfolio Heatmap
      </h2>
      <div className="min-h-0 flex-1">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              stroke="var(--background-panel)"
              content={<CellContent />}
              isAnimationActive={false}
            >
              <Tooltip
                formatter={(_value, _name, item) => [
                  formatPercent(((item?.payload as HeatmapNode)?.pnlPct as number) ?? 0),
                  "P&L",
                ]}
                contentStyle={{
                  background: "var(--background-elevated)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: 4,
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
            No positions yet
          </div>
        )}
      </div>
    </div>
  );
}
