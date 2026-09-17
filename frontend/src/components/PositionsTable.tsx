import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/format";
import type { Position } from "@/lib/types";

interface PositionsTableProps {
  positions: Position[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div className="flex h-full flex-col rounded-md border border-border-muted bg-panel">
      <div className="border-b border-border-muted px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Positions
        </h2>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-panel text-xs text-foreground-muted">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Ticker</th>
              <th className="px-3 py-1.5 text-right font-medium">Qty</th>
              <th className="px-3 py-1.5 text-right font-medium">Avg Cost</th>
              <th className="px-3 py-1.5 text-right font-medium">Price</th>
              <th className="px-3 py-1.5 text-right font-medium">P&amp;L</th>
              <th className="px-3 py-1.5 text-right font-medium">% Chg</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-foreground-muted">
                  No positions yet — buy something to get started.
                </td>
              </tr>
            )}
            {positions.map((p) => {
              const color = p.unrealized_pnl > 0 ? "text-up" : p.unrealized_pnl < 0 ? "text-down" : "";
              return (
                <tr key={p.ticker} className="border-b border-border-muted/50" data-testid={`position-${p.ticker}`}>
                  <td className="px-3 py-1.5 font-medium">{p.ticker}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{p.quantity}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(p.avg_cost)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(p.current_price)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono ${color}`}>
                    {formatSignedCurrency(p.unrealized_pnl)}
                  </td>
                  <td className={`px-3 py-1.5 text-right font-mono ${color}`}>
                    {formatPercent(p.unrealized_pnl_pct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
