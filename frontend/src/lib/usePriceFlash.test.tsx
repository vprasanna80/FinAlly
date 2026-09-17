import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePriceFlash } from "./usePriceFlash";

describe("usePriceFlash", () => {
  it("starts with no flash class", () => {
    const { result } = renderHook(({ price }) => usePriceFlash(price), {
      initialProps: { price: 100 },
    });
    expect(result.current).toBe("");
  });

  it("flashes up when price increases", () => {
    const { result, rerender } = renderHook(({ price }) => usePriceFlash(price), {
      initialProps: { price: 100 },
    });
    rerender({ price: 105 });
    expect(result.current).toBe("flash-up");
  });

  it("flashes down when price decreases", () => {
    const { result, rerender } = renderHook(({ price }) => usePriceFlash(price), {
      initialProps: { price: 100 },
    });
    rerender({ price: 95 });
    expect(result.current).toBe("flash-down");
  });

  it("clears the flash class after the animation duration", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ price }) => usePriceFlash(price), {
      initialProps: { price: 100 },
    });
    rerender({ price: 105 });
    expect(result.current).toBe("flash-up");

    vi.advanceTimersByTime(600);
    rerender({ price: 105 });
    expect(result.current).toBe("");
    vi.useRealTimers();
  });

  it("does not flash when price is unchanged", () => {
    const { result, rerender } = renderHook(({ price }) => usePriceFlash(price), {
      initialProps: { price: 100 },
    });
    rerender({ price: 100 });
    expect(result.current).toBe("");
  });
});
