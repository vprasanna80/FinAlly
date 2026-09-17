import "@testing-library/jest-dom/vitest";
import { installMockEventSource } from "./mockEventSource";

installMockEventSource();

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (MockResizeObserver as unknown as typeof ResizeObserver);
