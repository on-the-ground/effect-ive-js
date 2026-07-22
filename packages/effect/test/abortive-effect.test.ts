import { describe, it, expect, vi } from "vitest";
import { withAbortiveEffectHandler, abortEffect } from "../src/abortive-effect";
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
        // abortEffect resolves once "first" is enqueued, not once handleEvent has
        // run and aborted - give the daemon a tick to actually process it before
        // firing "second", or this test would pass by accident regardless of order.
        await new Promise((res) => setTimeout(res, 10));
        await abortEffect(ctx, TestEffect, "second"); // should be ignored
      }
    );

    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith("first");
  });

  it("propagates the abort to the signal seen inside effectfulThunk", async () => {
    const ctxWithSignal = withSignal(new AbortController().signal, emptyContext);
    let sawAborted = false;

    await withAbortiveEffectHandler(
      ctxWithSignal,
      TestEffect,
      async () => {},
      async (ctx) => {
        await abortEffect(ctx, TestEffect, "go");
        await new Promise((res) => setTimeout(res, 10));
        sawAborted = getSignal(ctx).aborted;
      }
    );

    expect(sawAborted).toBe(true);
  });
});
