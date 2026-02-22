import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { EditorContext } from "../src/components/editor";
import { BlockTypeSwitcher } from "../src/components/toolbar/BlockTypeSwitcher";
import { createEditorStore } from "../src/store/editor-store";
import { createBlock } from "@reiwuzen/blocky";

function withStore(ui: React.ReactNode, blocks: any[] = []) {
  const store = createEditorStore({ initialBlocks: blocks });
  return {
    store,
    ...render(
      <EditorContext.Provider value={store}>{ui}</EditorContext.Provider>,
    ),
  };
}

const paragraph = createBlock("paragraph").value!;

describe("<BlockTypeSwitcher />", () => {
  it("renders all block type options", () => {
    const { getAllByRole } = withStore(
      <BlockTypeSwitcher block={paragraph} onClose={vi.fn()} />,
      [paragraph],
    );
    const buttons = getAllByRole("button");
    expect(buttons.length).toBe(9); // all block types
  });

  it("marks current type as active", () => {
    const { container } = withStore(
      <BlockTypeSwitcher block={paragraph} onClose={vi.fn()} />,
      [paragraph],
    );
    const active = container.querySelector(".blocky-type-option--active");
    expect(active?.textContent).toBe("Text");
  });

  it("calls updateBlock and onClose on type select", () => {
    const onClose = vi.fn();
    const { store, getAllByRole } = withStore(
      <BlockTypeSwitcher block={paragraph} onClose={onClose} />,
      [paragraph],
    );
    const buttons = getAllByRole("button");
    const h1Btn = buttons.find((b) => b.textContent === "H1")!;
    fireEvent.mouseDown(h1Btn);
    expect(onClose).toHaveBeenCalled();
    expect(store.getState().blocks[0].type).toBe("heading1");
  });

  it("does not call onClose when same type is selected", () => {
    const onClose = vi.fn();
    const { getAllByRole } = withStore(
      <BlockTypeSwitcher block={paragraph} onClose={onClose} />,
      [paragraph],
    );
    const textBtn = getAllByRole("button").find(
      (b) => b.textContent === "Text",
    )!;
    fireEvent.mouseDown(textBtn);
    expect(onClose).toHaveBeenCalled(); // still called
  });
});
