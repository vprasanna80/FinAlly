import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PositionsTable } from "./PositionsTable";
import type { Position } from "@/lib/types";

describe("PositionsTable", () => {
  it("shows an empty state when there are no positions", () => {
    render(<PositionsTable positions={[]} />);
    expect(screen.getByText(/no positions yet/i)).toBeInTheDocument();
  });

  it("renders position rows with correctly formatted P&L", () => {
    const positions: Position[] = [
      {
        ticker: "AAPL",
        quantity: 10,
        avg_cost: 100,
        current_price: 120,
        market_value: 1200,
        unrealized_pnl: 200,
        unrealized_pnl_pct: 20,
      },
      {
        ticker: "TSLA",
        quantity: 5,
        avg_cost: 300,
        current_price: 270,
        market_value: 1350,
        unrealized_pnl: -150,
        unrealized_pnl_pct: -10,
      },
    ];
    render(<PositionsTable positions={positions} />);

    const aaplRow = screen.getByTestId("position-AAPL");
    expect(aaplRow).toHaveTextContent("AAPL");
    expect(aaplRow).toHaveTextContent("$100.00");
    expect(aaplRow).toHaveTextContent("$120.00");
    expect(aaplRow).toHaveTextContent("+$200.00");
    expect(aaplRow).toHaveTextContent("+20.00%");

    const tslaRow = screen.getByTestId("position-TSLA");
    expect(tslaRow).toHaveTextContent("-$150.00");
    expect(tslaRow).toHaveTextContent("-10.00%");
  });
});
