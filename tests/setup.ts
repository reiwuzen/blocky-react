import '@testing-library/jest-dom';

// ---- DragEvent polyfill for jsdom ----
class MockDragEvent extends Event {
  dataTransfer: any;

  constructor(type: string, options?: any) {
    super(type, options);
    this.dataTransfer = options?.dataTransfer ?? null;
  }
}

(global as any).DragEvent = MockDragEvent;