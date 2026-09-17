import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WatchlistPanel } from "./WatchlistPanel";
import type { WatchlistItem } from "@/lib/types";

const items: WatchlistItem[] = [
  { ticker: "AAPL", price: 190.5, prev_price: 189, change: 1.5, change_pct: 0.79, direction: "up", timestamp: "t" },
  { ticker: "TSLA", price: 250, prev_price: 255, change: -5, change_pct: -1.96, direction: "down", timestamp: "t" },
];

function setup(overrides: Partial<React.ComponentProps<typeof WatchlistPanel>> = {}) {
  const onSelect = vi.fn();
  const onRemove = vi.fn();
  const onAdd = vi.fn();
  render(
    <WatchlistPanel
      items={items}
      history={{}}
      selected={null}
      onSelect={onSelect}
      onRemove={onRemove}
      onAdd={onAdd}
      {...overrides}
    />
  );
  return { onSelect, onRemove, onAdd };
}

describe("WatchlistPanel", () => {
  it("renders every ticker with its price and change percent", () => {
    setup();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("190.50")).toBeInTheDocument();
    expect(screen.getByText("+0.79%")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    expect(screen.getByText("-1.96%")).toBeInTheDocument();
  });

  it("calls onSelect when a row is clicked", () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByTestId("watchlist-row-AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("calls onRemove when the remove button is clicked, without triggering select", () => {
    const { onRemove, onSelect } = setup();
    fireEvent.click(screen.getByLabelText("Remove TSLA"));
    expect(onRemove).toHaveBeenCalledWith("TSLA");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onAdd with an uppercased ticker from the add form", () => {
    const { onAdd } = setup();
    const input = screen.getByLabelText("Add ticker to watchlist");
    fireEvent.change(input, { target: { value: "pypl" } });
    fireEvent.submit(input.closest("form")!);
    expect(onAdd).toHaveBeenCalledWith("PYPL");
  });

  it("highlights the selected row", () => {
    setup({ selected: "AAPL" });
    expect(screen.getByTestId("watchlist-row-AAPL").className).toContain("bg-elevated");
  });
});
