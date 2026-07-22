import { describe, it, expect, vi } from "vitest";
import { withAbortiveEffectHandler, abortEffect } from "../src";
import { emptyContext, getSignal, withSignal } from "../src/effect_context";

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
          calls.push({sigSrc, payload});
        },
    ).run(async (ctx) => {
      abortEffect(ctx, TestEffect, "hello");
    });

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

      teardown
    ).run(async () => {});

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
    ).run(async (ctx) => {
      abortEffect(ctx, TestEffect, "first");
      // abort() flips the `aborted` guard synchronously - "second" is dropped
      // immediately, no queue/tick to wait out anymore.
      abortEffect(ctx, TestEffect, "second"); // should be ignored
    });

    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith("first");
  });

  it("propagates the abort to the signal seen inside effectfulThunk", async () => {
    const ctxWithSignal = withSignal(new AbortController().signal, emptyContext);

    await withAbortiveEffectHandler(
      ctxWithSignal,
      TestEffect,
      async () => {}
    ).run(async (ctx) => {
      abortEffect(ctx, TestEffect, "go");
      // controller.abort() runs synchronously inside abortEffect, so the
      // merged signal is already aborted by the time the call returns.
      expect(getSignal(ctx).aborted).toBe(true);
    });
  });
});
