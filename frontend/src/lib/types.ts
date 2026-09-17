export type Direction = "up" | "down" | "flat";

export interface PricePoint {
  ticker: string;
  price: number;
  prev_price: number;
  change: number;
  change_pct: number;
  direction: Direction;
  timestamp: string;
}

export interface WatchlistItem {
  ticker: string;
  price?: number;
  prev_price?: number;
  change?: number;
  change_pct?: number;
  direction?: Direction;
  timestamp?: string;
}

export interface Position {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

export interface Portfolio {
  cash_balance: number;
  positions: Position[];
  positions_value: number;
  total_value: number;
}

export interface Trade {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executed_at: string;
}

export interface Snapshot {
  total_value: number;
  recorded_at: string;
}

export interface WatchlistChangeResult {
  ticker: string;
  action: "add" | "remove";
}

export interface ChatActions {
  trades: Trade[];
  watchlist_changes: WatchlistChangeResult[];
  errors: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatActions;
}
