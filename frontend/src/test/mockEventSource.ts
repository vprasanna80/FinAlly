export class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];

  readyState = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  emitOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.();
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }

  emitError(closed = false) {
    this.readyState = closed ? MockEventSource.CLOSED : MockEventSource.CONNECTING;
    this.onerror?.();
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}

export function installMockEventSource() {
  MockEventSource.instances = [];
  // Test double, not a full EventSource implementation.
  globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
}
