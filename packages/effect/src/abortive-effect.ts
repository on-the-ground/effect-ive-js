import { mergeAbortSignal } from "@on-the-ground/daemonizer";
import {
  type EffectContextWithSignal,
  mustHaveHandler,
  registerEffectOnContext,
} from "./effect_context";

export interface AbortiveEffectHandler<P> {
  abort(payload: P): void;
}

/**
 * Registers a one-shot abortive effect handler into the supplied context.
 *
 * The first abort triggers the scope cancellation immediately, and subsequent
 * abort attempts are ignored. The provided `handleEvent` callback can still
 * perform async cleanup, but the abort call itself is synchronous.
 *
 * @template PCtx - Parent context type carrying an abort signal.
 * @template N - Symbol key used to register the handler.
 * @template P - Payload type the handler accepts.
 * @param pctx - Parent context that already exposes an abort signal.
 * @param effectName - Unique symbol key for the effect handler.
 * @param handleEvent - Async callback invoked for the first delivered payload.
 * @param teardown - Optional cleanup hook invoked after the handler finishes.
 * @returns A runner object with a `run` method that executes the effectful thunk.
 */
export function withAbortiveEffectHandler<
  PCtx extends EffectContextWithSignal,
  N extends symbol,
  P,
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (ctx: PCtx, payload: P) => Promise<void>,
  teardown?: () => void,
) {
  const controller = new AbortController();
  const mergedSignal = mergeAbortSignal(controller.signal, pctx);

  let aborted = false;
  let pending: Promise<void> | null = null;

  const handler: AbortiveEffectHandler<P> = {
    abort(payload: P) {
      if (aborted) return;
      aborted = true;
      controller.abort();
      // handleEvent's completion is awaited exactly once, by run()'s finally
      // below - teardown must not also run here, or it fires twice.
      pending = handleEvent(mergedSignal, payload);
    },
  };

  const ctxWithHandler = registerEffectOnContext<
    PCtx,
    N,
    AbortiveEffectHandler<P>
  >(effectName, handler, mergedSignal);

  return {
    run: async (
      effectfulThunk: (
        ctx: PCtx & { [K in N]: AbortiveEffectHandler<P> },
      ) => Promise<void>,
    ) => {
      try {
        await effectfulThunk(ctxWithHandler);
      } finally {
        if (pending) await pending;
        if (teardown) teardown();
      }
    },
  };
}

/**
 * Triggers the abortive effect handler registered in the context.
 *
 * The abort call itself is synchronous; the handler may perform async cleanup
 * internally, but the initial trigger happens immediately.
 *
 * @template N - Symbol key used to identify the effect.
 * @template P - Payload type accepted by the effect.
 * @param ctx - Context containing the registered handler.
 * @param name - Symbol key of the handler to invoke.
 * @param payload - Payload to deliver to the handler.
 */
export function abortEffect<N extends symbol, P>(
  ctx: { [K in N]: AbortiveEffectHandler<P> },
  name: N,
  payload: P,
): void {
  const handler = mustHaveHandler(ctx, name);
  handler.abort(payload);
}
