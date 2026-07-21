import { describe, it, expect, vi } from "vitest";
import {
  withFireAndForgetEffectHandler,
  fireAndForgetEffect,
} from "../src/fire-and-forget-effect";
import { emptyContext, withSignal } from "../src/effect_context";

const LogEffect: unique symbol = Symbol("log");
const NoopEffect: unique symbol = Symbol("noop");

describe("fireAndForgetEffect", () => {
  it("should process pushed event with the handler", async () => {
    const spy = vi.fn();
    const controller = new AbortController();
    const ctxWithSignal = withSignal(controller.signal, emptyContext);
    await withFireAndForgetEffectHandler(
      ctxWithSignal,
      LogEffect,
      async (_sig, payload: string) => {
        spy(payload);
      },
      async (ctx) => {
        await fireAndForgetEffect(ctx, LogEffect, "hello");
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
      NoopEffect,
      async (_sig, payload: string) => {
        spy(payload);
      },
      async (ctx) => {
        controller.abort(); // Abort before pushing
        await fireAndForgetEffect(ctx, NoopEffect, "won't be processed");
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
      LogEffect,
      async (_sig) => {},
      async () => {},
      teardown
    );

    expect(teardown).toHaveBeenCalled();
  });
});
