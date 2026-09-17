import type { ConnectionStatus } from "@/lib/usePriceStream";
import { formatCurrency } from "@/lib/format";
import type { Portfolio } from "@/lib/types";

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connecting: { color: "bg-accent-yellow", label: "Connecting" },
  connected: { color: "bg-up", label: "Connected" },
  reconnecting: { color: "bg-accent-yellow", label: "Reconnecting" },
  disconnected: { color: "bg-down", label: "Disconnected" },
};

interface HeaderProps {
  portfolio: Portfolio | null;
  status: ConnectionStatus;
}

export function Header({ portfolio, status }: HeaderProps) {
  const { color, label } = STATUS_CONFIG[status];

  return (
    <header className="flex items-center justify-between border-b border-border-muted bg-panel px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-tight text-accent-yellow">FinAlly</span>
        <span className="hidden text-xs text-foreground-muted sm:inline">
          AI Trading Workstation
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <div className="text-xs text-foreground-muted">Total Value</div>
          <div className="font-mono text-base font-semibold">
            {portfolio ? formatCurrency(portfolio.total_value) : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground-muted">Cash</div>
          <div className="font-mono text-base">
            {portfolio ? formatCurrency(portfolio.cash_balance) : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2" title={label} data-testid="connection-status">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span className="hidden text-xs text-foreground-muted md:inline">{label}</span>
        </div>
      </div>
    </header>
  );
}
