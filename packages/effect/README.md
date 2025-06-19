# @on-the-ground/effect

Effect system primitives for implementing structured, resumable, abortive, and fire-and-forget effects in JavaScript/TypeScript.

This package provides **core effect abstractions** such as:

- **ResumableEffect** – structured yield/resume pattern for cooperative effects
- **AbortiveEffect** – immediate failure propagation with `AbortSignal` support
- **FireAndForgetEffect** – untracked, non-blocking execution with context awareness

## 📁 Directory Structure

```
src/
├── index.ts                  # Entry point
├── resumable-effect.ts       # Handler for suspendable/resumable effects
├── abortive-effect.ts        # Handler for abort-aware, one-way effects
├── fire-and-forget-effect.ts # Handler for non-blocking "fire and forget" effects
```

## ✅ Features

- Modular and composable effect handlers
- Abort signal wiring via `AbortSignal`
- Type-safe cooperative effect management
- Fully ESM and CJS compatible (via Rollup)

## 🧪 Testing

Tests live under `/test` using `vitest`:

```
test/
├── abortive-effect.test.ts
├── fire-and-forget.test.ts
└── resumable-effect.test.ts
```

```bash
yarn test
```

## 🔧 Build

```bash
yarn build
```
