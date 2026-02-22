import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import { EditorContext } from "../src/components/editor";
import { BlockList } from "../src/components/blockList";
import { createEditorStore } from "../src/store/editor-store";
import { createBlock } from "@reiwuzen/blocky";

function withStore(blocks: any[] = []) {
  const store = createEditorStore({ initialBlocks: blocks });
  const utils = render(
    <EditorContext.Provider value={store}>
      <BlockList />
    </EditorContext.Provider>,
  );
  return { store, ...utils };
}

const paragraph = createBlock("paragraph").value!;
const code = createBlock("code").value!;
const equation = createBlock("equation").value!;

describe("<BlockList />", () => {
  it("renders nothing when no blocks", () => {
    const { container } = withStore([]);
    expect(container.querySelectorAll(".blocky-block-row")).toHaveLength(0);
  });

  it("renders one row per block", () => {
    const { container } = withStore([paragraph, code, equation]);
    expect(container.querySelectorAll(".blocky-block-row")).toHaveLength(3);
  });

  it("reorders blocks on drop", async () => {
    const { store, container } = withStore([paragraph, code]);
    const rows = container.querySelectorAll(".blocky-block-row");

    // simulate drag drop — code onto paragraph position
    const dropEvent = new DragEvent("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: { getData: () => code.id, preventDefault: vi.fn() },
    });
    await act(async () => rows[0].dispatchEvent(dropEvent));

    const blocks = store.getState().blocks;
    expect(blocks[0].id).toBe(code.id);
    expect(blocks[1].id).toBe(paragraph.id);
  });

  it("does not reorder when dropping on self", async () => {
    const { store, container } = withStore([paragraph, code]);
    const rows = container.querySelectorAll(".blocky-block-row");

    const dropEvent = new DragEvent("drop", { bubbles: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: { getData: () => paragraph.id, preventDefault: vi.fn() },
    });
    await act(async () => rows[0].dispatchEvent(dropEvent));

    const blocks = store.getState().blocks;
    expect(blocks[0].id).toBe(paragraph.id); // unchanged
  });

  it("sets activeBlockId when block focused", async () => {
    const { store, container } = withStore([paragraph, code]);
    const contentEditable = container.querySelector("[contenteditable]")!;
    fireEvent.focus(contentEditable);
    expect(store.getState().activeBlockId).toBeTruthy();
  });
});
