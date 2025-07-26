import { describe, it, expect, vi } from "vitest";
import {
  withResumableEffectHandler,
  performEffect,
  type Resolvable,
} from "../src/resumable-effect";
import {
  type EffectContextWithSignal,
  emptyContext,
  withSignal,
} from "../src/effect_context";

describe("withResumableEffectHandler + performEffect", () => {
  it("should perform effect and resolve with expected value", async () => {
    type Payload = { message: string };

    const handler = vi.fn(
      async (
        _signal: EffectContextWithSignal,
        payload: Payload & Resolvable<string>
      ) => {
        setTimeout(() => {
          payload.resolve("hello " + payload.message);
        }, 10);
      }
    );
    const ctxWithSignal = withSignal(
      new AbortController().signal,
      emptyContext
    );

    await withResumableEffectHandler(
      ctxWithSignal,
      "resumable",
      handler,
      async (ctx) => {
        const result = await performEffect(ctx, "resumable", {
          message: "world",
        });
        expect(result).toBe("hello world");
      }
    );

    expect(handler).toHaveBeenCalledOnce();
  });

  it("should call teardown and close handler", async () => {
    const teardownSpy = vi.fn();

    const handler = vi.fn(
      async (_signal: EffectContextWithSignal, payload: Resolvable<number>) => {
        payload.resolve(42);
      }
    );

    const ctxWithSignal = withSignal(
      new AbortController().signal,
      emptyContext
    );
    await withResumableEffectHandler(
      ctxWithSignal,
      "num",
      handler,
      async (ctx) => {
        const result = await performEffect(ctx, "num", {});
        expect(result).toBe(42);
      },
      teardownSpy
    );

    expect(teardownSpy).toHaveBeenCalled();
  });
});
