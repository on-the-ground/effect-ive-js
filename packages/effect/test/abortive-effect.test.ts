import { describe, it, expect, vi } from "vitest";
import { withAbortiveEffectHandler, abortEffect } from "../src/abortive-effect";
import { emptyContext, withSignal } from "../src/effect_context";

const TestEffect: unique symbol = Symbol("testEffect");

describe("withAbortiveEffectHandler", () => {
  it("should call handler and abort after first event", async () => {
    const calls: any[] = [];

    const signal = new AbortController().signal;
    const ctxWithSignal = withSignal(signal, emptyContext);

    await withAbortiveEffectHandler(
      ctxWithSignal,
      TestEffect,
      async (sigSrc, payload: any) => {
        calls.push({ sigSrc, payload });
      },
      async (ctx) => {
        await abortEffect(ctx, TestEffect, "hello");
      }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toBe("hello");
  });

  it("should call teardown after execution", async () => {
    const teardown = vi.fn();

    const ctxWithSignal = withSignal(
      new AbortController().signal,
      emptyContext
    );

    await withAbortiveEffectHandler(
      ctxWithSignal,
      TestEffect,
      async () => {},
      async () => {},
      teardown
    );

    expect(teardown).toHaveBeenCalledOnce();
  });

  it("should not call handler after abort", async () => {
    const handle = vi.fn();

    const ctxWithSignal = withSignal(
      new AbortController().signal,
      emptyContext
    );

    await withAbortiveEffectHandler(
      ctxWithSignal,
      TestEffect,
      async (_, payload) => {
        handle(payload);
      },
      async (ctx) => {
        await abortEffect(ctx, TestEffect, "first");
        await new Promise((res) => setTimeout(res, 10));
        await abortEffect(ctx, TestEffect, "second"); // should be ignored
      }
    );

    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith("first");
  });
});
