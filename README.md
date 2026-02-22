# @reiwuzen/blocky-react

React UI layer for **@reiwuzen/blocky** — a composable, headless block editor engine.

This package provides React components, hooks, and store bindings for building Notion-style editors while keeping core logic framework-agnostic.

---

## ✨ Features

- Composable block components
- Controlled & uncontrolled modes
- Zustand-based state isolation
- Headless engine separation (`@reiwuzen/blocky`)
- Fully testable
- No CSS framework required
- ESM + CJS support

---

## 📦 Installation

```bash
pnpm add @reiwuzen/blocky-react @reiwuzen/blocky
# or
npm install @reiwuzen/blocky-react @reiwuzen/blocky
```

Peer dependencies:

```bash
react >= 18
react-dom >= 18
```

---

## 🚀 Basic Usage (Uncontrolled)

```tsx
import { Editor } from "@reiwuzen/blocky-react";
import "@reiwuzen/blocky-react/styles.css";

export default function App() {
  return (
    <Editor />
  );
}
```

The editor will initialize with a single empty paragraph block.

---

## 🎯 Controlled Mode

```tsx
import { useState } from "react";
import { Editor } from "@reiwuzen/blocky-react";
import type { AnyBlock } from "@reiwuzen/blocky";

export default function App() {
  const [blocks, setBlocks] = useState<AnyBlock[]>([]);

  return (
    <Editor
      blocks={blocks}
      onChange={setBlocks}
    />
  );
}
```

You now own the editor state.

---

## 🧱 Available Components

You can build your own layout using individual components:

```tsx
import {
  BlockList,
  Block,
  FormatToolbar,
  BlockTypeSwitcher
} from "@reiwuzen/blocky-react";
```

---

## 🪝 Hooks

```tsx
import {
  useBlocks,
  useActiveBlockId,
  useEditorActions
} from "@reiwuzen/blocky-react";
```

Example:

```tsx
const blocks = useBlocks();
const { insertBlockAfter } = useEditorActions();
```

---

## 🏗 Architecture

```
@reiwuzen/blocky        → Headless editor engine
@reiwuzen/blocky-react  → React UI adapter
```

Core editing logic lives in `blocky`.  
React layer only handles rendering and interaction.

This separation ensures:

- Framework independence
- Testability
- Predictable state updates
- Clean packaging

---

## 🎨 Styling

Basic styles are included:

```tsx
import "@reiwuzen/blocky-react/styles.css";
```

You may fully override styles or ignore them entirely.

---

## 🧪 Testing

This package uses:

- Vitest
- React Testing Library
- jsdom

All components are fully testable without a browser.

---

## 📄 License

ISC

---

## 👤 Author

Rei WuZen