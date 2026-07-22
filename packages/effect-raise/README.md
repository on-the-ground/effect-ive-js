# @on-the-ground/effect-raise

Structured raise/catch effect built on top of `@on-the-ground/effect`.

This package introduces a new kind of effect:

- **RaiseEffect**: semantically similar to `throw`, but modeled as a **composable effect** — not an exception.

It allows early-exit from asynchronous computations **without using try/catch** or throwing exceptions.

---

## 🧠 Why not just throw?

Traditional exception handling via `throw` is:

- ❌ Not async-safe — `throw` can't cross `await` boundaries
- ❌ Implicit — it breaks the control flow without being declared
- ❌ Crash-prone — if unhandled, it terminates the process
- ❌ Hard to test — you need to wrap in try/catch just to check failure

In contrast, `raiseEffect`:

- ✅ Works across async boundaries
- ✅ Requires an explicit handler (`withRaiseEffectHandler`)
- ✅ Doesn't crash — returns the raised value as a result
- ✅ Is composable, cooperative, and testable

---

## 🔍 Concept

You **raise** an error as a value (not as an exception).  
The nearest `withRaiseEffectHandler` catches it and returns the error.

This is implemented internally via `AbortiveEffect` and `Promise.race`.

---

## ✨ Example

```ts
import {
  withRaiseEffectHandler,
  raiseEffect,
} from "@on-the-ground/effect-raise";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("raiseEffect across async call boundaries", () => {
  it("should propagate raised error through multiple async functions", async () => {
    class CustomError extends Error {}

    async function level3(ctx: any) {
      await delay(10);
      raiseEffect(ctx, new CustomError("raised at level 3"));
    }

    async function level2(ctx: any) {
      await delay(10);
      await level3(ctx);
    }

    async function level1(ctx: any) {
      await delay(10);
      await level2(ctx);
    }

    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        await level1(ctx);
      }
    );

    expect(result).toBeInstanceOf(CustomError);
    expect((result as CustomError).message).toBe("raised at level 3");
  });
});
```

---

## 🔧 API

### `withRaiseEffectHandler(pctx, effectfulThunk, mode?): Promise<E | void>`

Wraps an async computation. Allows `raiseEffect(ctx, err)` to short-circuit and return `err`.

- `pctx`: a context that includes an `AbortSignal`
- `effectfulThunk`: an async function that may raise
- `mode`: a `RaiseMode` controlling how the raise affects the surrounding thunk (defaults to `"urgent"`)

### `raiseEffect(ctx, err): void`

Triggers the abortive effect named `effect_raise` with `err`.

- The error will be caught by the enclosing `withRaiseEffectHandler`.
- The call itself is synchronous.

### `RaiseMode = "urgent" | "graceful"`

Controls how a raise is allowed to affect the surrounding `effectfulThunk`:

- **`"urgent"` (default)** - Race the raise against `effectfulThunk`. The moment an error is raised, `withRaiseEffectHandler` returns it immediately and whatever `effectfulThunk` was still doing is abandoned, not awaited. (Similar to SIGKILL)
- **`"graceful"`** - Never abandon `effectfulThunk`. The abort signal fires the instant something is raised (so cooperative cleanup can react), but `withRaiseEffectHandler` itself waits for `effectfulThunk` to actually finish before returning the raised error. (Similar to SIGTERM)

### `Result<E> = E | void`

The result of `withRaiseEffectHandler`.  
Either the raised error or `void` if no error occurred.

---

## 📁 Directory Structure

```
src/
├── effect.ts   # RaiseEffect logic (delegates to AbortiveEffect)
├── index.ts    # Re-exports
test/
└── effect.test.ts
```

---

## 🧪 Testing

Run all tests with:

```bash
yarn test
```

---

## 🔗 Related

- [@on-the-ground/effect](../effect) – Core system with resumable, abortive, and fire-and-forget effects.

---

## 💡 Summary

`raiseEffect` is for:

> "Abort this computation with a reason — without throwing."

It’s a **structured, async-safe early-exit mechanism** — ideal for functional, effectful code.
