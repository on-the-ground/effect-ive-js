# @on-the-ground/effect

This package exposes small composable helpers for building effect-driven APIs with `AbortSignal` support, typed effect tokens, and proxy-backed handlers.

## What this package provides

- `withEffectHandler(...)` for creating a proxy-backed effect handler with resumable or fire-and-forget usage.
- `withAbortiveEffectHandler(...)` and `abortEffect(...)` for one-shot abortive effects that cancel the surrounding scope after the first event.
- `effectTokenOf(...)` and the `EffectToken` / `ExpectedInterface` types for strongly typed effect keys.
- Context helpers such as `emptyContext`, `withSignal(...)`, `registerHandlerOnContext(...)`, `registerEffectOnContext(...)`, `getSignal(...)`, and `mustHaveHandler(...)`.

## Quick example

```ts
import {
  emptyContext,
  effectTokenOf,
  withEffectHandler,
  withSignal,
} from "@on-the-ground/effect";

interface Greeter {
  greet(message: string): string;
}

const GreeterEffect = effectTokenOf<Greeter>("greeter");

const ctx = withSignal(new AbortController().signal, emptyContext);

await withEffectHandler(ctx, GreeterEffect, class {
  greet(message: string) {
    return `hello ${message}`;
  }
}).run(async (ctx) => {
  const result = await ctx[GreeterEffect].greet("world");
  console.log(result); // hello world
});
```

## Abortive effect example

```ts
import { abortEffect, emptyContext, withAbortiveEffectHandler, withSignal } from "@on-the-ground/effect";

const effectName = Symbol("effect");
const ctx = withSignal(new AbortController().signal, emptyContext);

await withAbortiveEffectHandler(
  ctx,
  effectName,
  async (_ctx, payload) => {
    console.log(payload);
  },
).run(async (ctx) => {
  await abortEffect(ctx, effectName, "hello");
});
```

## Source layout

```text
src/
├── index.ts               # Public entry point
├── abortive-effect.ts     # Abortive effect helpers
├── effect.ts              # Proxy-backed effect handler helper
├── effect_context.ts      # Context and signal helpers
└── effect_token.ts        # Typed effect token helpers
```

## Tests

Tests live under `test/` and use `vitest`:

```text
test/
├── abortive-effect.test.ts
├── effect-context.test.ts
└── effect.test.ts
```

```bash
yarn test
```

## Build

```bash
yarn build
```
