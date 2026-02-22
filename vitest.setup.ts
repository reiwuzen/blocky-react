// vitest.setup.ts
class MockDragEvent extends Event {
  dataTransfer: any
  constructor(type: string, options?: any) {
    super(type, options)
    this.dataTransfer = options?.dataTransfer ?? null
  }
}

(global as any).DragEvent = MockDragEvent