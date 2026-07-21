## 📦 Effect-ive JavaScript

![The effect-ive javascript mascot](./assets/effect-ive-javascript-mascot.png)

**Composable, idiomatic effect handling in TypeScript — with no magic.**

Effect-ive TypeScript is a lightweight toolkit for structuring real-world effects in TypeScript  
— purely with `Promise`, `AbortSignal`, and plain objects.  
🚫 No generator. 🚫 No continuation. 🚫 No framework.

---

### 🧠 Philosophy

Effect-ive TypeScript is grounded in one principle:

> **Separate the effect _request_ from the effect _handling_.**

Inspired by Algebraic Effects — but reimagined for the world of `Promise`.  
It brings clarity and testability to async logic, without relying on generator tricks or custom interpreters.

---

### 🔧 Packages

- [`@on-the-ground/effect`](https://www.npmjs.com/package/@on-the-ground/effect)  
   Structured async effects, contextualized with `AbortSignal`.  
   Composable effect scopes with `withEffectHandler`, `performEffect`, and more.
- [`@on-the-ground/effect-raise`](https://www.npmjs.com/package/@on-the-ground/effect-raise)  
   Declarative control flow: raise, resume, and recover errors in context-aware, type-safe fashion.

---

### ✅ Key Features

- ✅ **No generator or continuation required**
- ✅ **Purely Promise-based and type-safe**
- ✅ **Composable effect handlers**
- ✅ **Abort-safe, cancel-friendly context**
- ✅ **No runtime dependency** — just TypeScript and `@on-the-ground/daemonizer`

---

### 📁 Monorepo Structure

```
packages/
├── effect          ← core effect handler (AbortSignal-based)
├── effect-raise    ← raise/resume for recoverable control flow
```

Each package has its own README with full examples.

---

### 🚀 Quick Start

```bash
npm install @on-the-ground/effect
```

Then compose effect scopes like:

````javascript
await withAbortiveEffectHandler(
    withSignal(signal, {}),
    "log",
    async (signal, msg: string) => console.log(msg),
    async (ctx) => {
        await abortEffect(ctx, "log", "Hello, effect!");
    }
);
```

---

````
