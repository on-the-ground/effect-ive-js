import { describe, it, expect, vi } from "vitest";
import { withAbortiveEffectHandler, abortEffect } from "../src/effect";
import { emptyContext, withSignal } from "@on-the-ground/effect-context";

describe("withAbortiveEffectHandler", () => {
  it("should call handler and abort after first event", async () => {
    const calls: any[] = [];

    const signal = new AbortController().signal;
    const ctxWithSignal = withSignal(emptyContext, signal);

    await withAbortiveEffectHandler(
      ctxWithSignal,
      "testEffect",
      async (signal, payload: any) => {
        calls.push({ signal, payload });
      },
      async (ctx) => {
        await abortEffect(ctx, "testEffect", "hello");
      }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toBe("hello");
  });

  it("should call teardown after execution", async () => {
    const teardown = vi.fn();

    const ctxWithSignal = withSignal(
      emptyContext,
      new AbortController().signal
    );

    await withAbortiveEffectHandler(
      ctxWithSignal,
      "testEffect",
      async () => {},
      async () => {},
      teardown
    );

    expect(teardown).toHaveBeenCalledOnce();
  });

  it("should not call handler after abort", async () => {
    const handle = vi.fn();

    const ctxWithSignal = withSignal(
      emptyContext,
      new AbortController().signal
    );

    await withAbortiveEffectHandler(
      ctxWithSignal,
      "testEffect",
      async (_, payload) => {
        handle(payload);
      },
      async (ctx) => {
        await abortEffect(ctx, "testEffect", "first");
        await new Promise((res) => setTimeout(res, 10));
        await abortEffect(ctx, "testEffect", "second"); // should be ignored
      }
    );

    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith("first");
  });
});
