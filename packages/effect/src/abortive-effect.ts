import { Daemon, mergeAbortSignal } from "@on-the-ground/daemonizer";
import {
  type EffectContextWithSignal,
  mustHaveHandler,
  registerHandlerOnContext,
} from "./effect_context";

/**
 * Registers a one-shot abortive effect handler into the supplied context.
 *
 * The first event delivered through the handler aborts the local controller, which
 * propagates cancellation through the merged context so later work can observe
 * the abort signal. The supplied `handleEvent` callback runs with the augmented
 * context and payload before the abort is triggered.
 *
 * @template PCtx - Parent context type carrying an abort signal.
 * @template N - Symbol key used to register the handler.
 * @template P - Payload type the handler accepts.
 * @param pctx - Parent context that already exposes an abort signal.
 * @param effectName - Unique symbol key for the effect handler.
 * @param handleEvent - Async callback invoked for the first delivered payload.
 * @param teardown - Optional cleanup hook invoked when the runner exits.
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

  const handler = new Daemon(
    mergedSignal,
    async (pctx, payload: P) => {
      // Abort even if handleEvent throws - this effect is single-shot, so the
      // scope must close on the first event regardless of how it was handled.
      try {
        await handleEvent(pctx, payload);
      } finally {
        controller.abort();
      }
    },
    10,
  );

  // Register on mergedSignal (a PCtx-shaped clone of pctx with SIGNAL_KEY replaced),
  // not pctx itself - otherwise effectfulThunk's context would still carry the
  // pre-abort signal, and nested effects would never observe this abort.
  const ctxWithHandler = registerHandlerOnContext<PCtx, N, P>(
    effectName,
    handler,
    mergedSignal,
  );

  return {
    run: async (
      effectfulThunk: (
        ctx: PCtx & { [K in N]: Daemon<P, PCtx> },
      ) => Promise<void>,
    ) => {
      try {
        await effectfulThunk(ctxWithHandler);
      } finally {
        if (teardown) teardown();
        await handler.close();
      }
    },
  };
}

/**
 * Pushes a payload into a named abortive effect handler.
 *
 * The returned promise resolves once the payload is queued, not once the handler
 * has finished processing it or aborted the surrounding scope.
 *
 * @template N - Symbol key used to identify the effect.
 * @template P - Payload type accepted by the effect.
 * @param ctx - Context containing the registered handler.
 * @param name - Symbol key of the handler to invoke.
 * @param payload - Payload to deliver to the handler.
 * @returns A promise that resolves when the payload has been queued.
 */
export async function abortEffect<N extends symbol, P>(
  ctx: { [K in N]: Daemon<P, any> },
  name: N,
  payload: P,
): Promise<void> {
  const handler = mustHaveHandler(ctx, name);
  await handler.pushEvent(payload);
}
