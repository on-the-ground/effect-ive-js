import { describe, it, expect, vi } from "vitest";
import {
  withFireAndForgetEffectHandler,
  fireAndForgetEffect,
} from "../src/fire-and-forget-effect";
import {
  _withSignal,
  emptyContext,
  withSignal,
} from "../../internal/effect_context";

describe("fireAndForgetEffect", () => {
  it("should process pushed event with the handler", async () => {
    const spy = vi.fn();
    const controller = new AbortController();
    const ctxWithSignal = withSignal(controller.signal, emptyContext);
    await withFireAndForgetEffectHandler(
      ctxWithSignal,
      "log",
      async (_sig, payload: string) => {
        spy(payload);
      },
      async (ctx) => {
        await fireAndForgetEffect(ctx, "log", "hello");
      }
    );

    expect(spy).toHaveBeenCalledWith("hello");
  });

  it("should not process event after abort", async () => {
    const spy = vi.fn();
    const controller = new AbortController();
    const ctxWithSignal = withSignal(controller.signal, emptyContext);

    await withFireAndForgetEffectHandler(
      ctxWithSignal,
      "noop",
      async (_sig, payload: string) => {
        spy(payload);
      },
      async (ctx) => {
        controller.abort(); // Abort before pushing
        await fireAndForgetEffect(ctx, "noop", "won't be processed");
      }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it("should call teardown and close after thunk", async () => {
    const controller = new AbortController();
    const ctxWithSignal = withSignal(controller.signal, emptyContext);
    const teardown = vi.fn();

    await withFireAndForgetEffectHandler(
      ctxWithSignal,
      "log",
      async (_sig, payload) => {},
      async (ctx) => {},
      teardown
    );

    expect(teardown).toHaveBeenCalled();
  });
});
