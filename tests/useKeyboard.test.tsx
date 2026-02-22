import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { EditorContext } from "../src/components/editor";
import { createEditorStore } from "../src/store/editor-store";
import { createBlock } from "@reiwuzen/blocky";
import { useBlockKeyboard } from "../src/hooks/useBlockKeyboard";
import { useBlocks, useEditorActions } from "../src/hooks/useEditor";

// Simple test component that uses the hook
function TestBlock({ block }: { block: any }) {
  const blocks = useBlocks();
  const { updateBlock } = useEditorActions();
  const handleKeyDown = useBlockKeyboard({
    block,
    blocks,
    onUpdate: updateBlock,
    onFocus: vi.fn(),
  });
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onKeyDown={handleKeyDown}
      data-testid="block"
    />
  );
}

function setup(blocks: any[]) {
  const store = createEditorStore({ initialBlocks: blocks });
  const utils = render(
    <EditorContext.Provider value={store}>
      <TestBlock block={blocks[0]} />
    </EditorContext.Provider>,
  );
  return { store, el: utils.getByTestId("block"), ...utils };
}

const paragraph = {
  ...createBlock("paragraph").value!,
  content: [{ type: "text", text: "Hello World" }],
};
const paragraph2 = createBlock("paragraph").value!;
const bullet = createBlock("bullet").value!;
const todo = createBlock("todo").value!;

describe("useBlockKeyboard", () => {
  it("Enter calls insertAfter", async () => {
    const { store } = setup([paragraph]);
    const el = document.querySelector("[contenteditable]")!;
    await act(async () => {
      fireEvent.keyDown(el, { key: "Enter" });
    });
    expect(store.getState().blocks.length).toBeGreaterThan(1);
  });

  it("Shift+Enter does not split block", async () => {
    const { store } = setup([paragraph]);
    const el = document.querySelector("[contenteditable]")!;
    await act(async () => {
      fireEvent.keyDown(el, { key: "Enter", shiftKey: true });
    });
    expect(store.getState().blocks).toHaveLength(1);
  });

  it("Tab indents bullet block", async () => {
    const { store } = setup([bullet]);
    const el = document.querySelector("[contenteditable]")!;
    await act(async () => {
      fireEvent.keyDown(el, { key: "Tab" });
    });
    expect(store.getState().blocks[0].meta.depth).toBe(1);
  });

  it("Shift+Tab outdents bullet block", async () => {
    const indented = { ...bullet, meta: { depth: 2 } };
    const store = createEditorStore({ initialBlocks: [indented] });
    const { getByTestId } = render(
      <EditorContext.Provider value={store}>
        <TestBlock block={indented} />
      </EditorContext.Provider>,
    );
    await act(async () => {
      fireEvent.keyDown(getByTestId("block"), { key: "Tab", shiftKey: true });
    });
    expect(store.getState().blocks[0].meta.depth).toBe(1);
  });

  it("Tab does not indent non-indentable block", async () => {
    const { store } = setup([paragraph]);
    const el = document.querySelector("[contenteditable]")!;
    await act(async () => {
      fireEvent.keyDown(el, { key: "Tab" });
    });
    expect(store.getState().blocks[0].meta).toEqual({});
  });

  it("Space triggers markdown transform on matching text", async () => {
    // Mock anchorOffset to simulate "# " typed
    const hashParagraph = {
      ...paragraph,
      content: [{ type: "text", text: "# " }],
    };
    const store = createEditorStore({ initialBlocks: [hashParagraph] });
    const { getByTestId } = render(
      <EditorContext.Provider value={store}>
        <TestBlock block={hashParagraph} />
      </EditorContext.Provider>,
    );
    vi.spyOn(window, "getSelection").mockReturnValue({
      anchorOffset: 2,
      rangeCount: 1,
    } as any);
    await act(async () => {
      fireEvent.keyDown(getByTestId("block"), { key: " " });
    });
    expect(store.getState().blocks[0].type).toBe("heading1");
  });
});
