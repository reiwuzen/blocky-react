import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { createEditorStore } from "../src/store/editor-store";
import { EditorContext } from "../src/components/editor";
import { Block } from "../src/components/block";
import { createBlock } from "@reiwuzen/blocky";

function withStore(ui: React.ReactNode, initialBlocks: any[] = []) {
  const store = createEditorStore({ initialBlocks });
  return render(
    <EditorContext.Provider value={store}>{ui}</EditorContext.Provider>,
  );
}

const onFocus = vi.fn();
const onDragStart = vi.fn();
const onDrop = vi.fn();

const paragraph = createBlock("paragraph").value!;
const heading1 = {
  ...createBlock("heading1").value!,
  content: [{ type: "text", text: "Title" }],
};
const bullet = createBlock("bullet").value!;
const number = createBlock("number").value!;
const todo = createBlock("todo").value!;
const code = createBlock("code").value!;
const equation = createBlock("equation").value!;

function blockProps(block: any, isActive = false) {
  return { block, isActive, onFocus, onDragStart, onDrop };
}

describe("<Block />", () => {
  it("renders paragraph block", () => {
    const { container } = withStore(<Block {...blockProps(paragraph)} />, [
      paragraph,
    ]);
    expect(container.querySelector(".blocky-paragraph")).toBeTruthy();
  });

  it("renders heading1 block", () => {
    const { container } = withStore(<Block {...blockProps(heading1)} />, [
      heading1,
    ]);
    expect(container.querySelector(".blocky-h1")).toBeTruthy();
  });

  it("renders bullet block", () => {
    const { container } = withStore(<Block {...blockProps(bullet)} />, [
      bullet,
    ]);
    expect(container.querySelector(".blocky-bullet")).toBeTruthy();
  });

  it("renders number block", () => {
    const { container } = withStore(<Block {...blockProps(number)} />, [
      number,
    ]);
    expect(container.querySelector(".blocky-number")).toBeTruthy();
  });

  it("renders todo block with checkbox", () => {
    const { container } = withStore(<Block {...blockProps(todo)} />, [todo]);
    expect(container.querySelector(".blocky-todo-checkbox")).toBeTruthy();
  });

  it("renders code block", () => {
    const { container } = withStore(<Block {...blockProps(code)} />, [code]);
    expect(container.querySelector(".blocky-code-block")).toBeTruthy();
  });

  it("renders equation block", () => {
    const { container } = withStore(<Block {...blockProps(equation)} />, [
      equation,
    ]);
    expect(container.querySelector(".blocky-equation-block")).toBeTruthy();
  });

  it("renders drag handle", () => {
    const { container } = withStore(<Block {...blockProps(paragraph)} />, [
      paragraph,
    ]);
    expect(container.querySelector(".blocky-drag-handle")).toBeTruthy();
  });

  it("renders type switcher button", () => {
    const { container } = withStore(<Block {...blockProps(paragraph)} />, [
      paragraph,
    ]);
    expect(container.querySelector(".blocky-type-btn")).toBeTruthy();
  });

  it("does not show format toolbar when not active", () => {
    const { container } = withStore(
      <Block {...blockProps(paragraph, false)} />,
      [paragraph],
    );
    expect(container.querySelector(".blocky-format-toolbar")).toBeNull();
  });

  it("shows type switcher on button click", async () => {
    const { container, getByTitle } = withStore(
      <Block {...blockProps(paragraph)} />,
      [paragraph],
    );
    const btn = getByTitle("Change block type");
    btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector(".blocky-type-switcher")).toBeTruthy();
  });

  it("applies blocky-drag-over class on drag over", () => {
    const { container } = withStore(<Block {...blockProps(paragraph)} />, [
      paragraph,
    ]);
    const row = container.querySelector(".blocky-block-row")!;
    fireEvent.dragOver(row);
    expect(row.classList.contains("blocky-drag-over")).toBe(true);
  });
});
