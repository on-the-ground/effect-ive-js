import { Daemon, mergeAbortSignal } from "@on-the-ground/daemonizer";
import {
  type EffectContextWithSignal,
  mustHaveHandler,
  registerHandlerOnContext,
} from "./effect_context";

/**
 * Registers an abortive effect handler into the given context, executes the provided
 * asynchronous thunk, and ensures proper cleanup and cancellation behavior.
 *
 * This handler is designed to handle a single event. Once the event is handled,
 * the internal AbortController is triggered, propagating cancellation to the entire context.
 *
 * @template N - The name (key) of the effect to register
 * @template P - The payload type accepted by the effect handler
 *
 * @param pctx - The parent context, which must already include an AbortSignal
 * @param effectName - A unique string name for the effect within the context
 * @param handleEvent - The effect handler function; receives the context and payload.
 *                      The effect scope is aborted once this returns or throws.
 * @param effectfulThunk - A function that performs async logic using the extended context
 * @param teardown - (Optional) Cleanup function to be called after the thunk finishes or is aborted
 *
 * @returns A Promise that resolves after the effectfulThunk has completed or been aborted
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
 * Pushes a payload into a named effect handler within the context.
 * Intended to trigger an abortive handler registered with `withAbortiveEffectHandler`.
 *
 * @template N - The name of the effect to trigger
 * @template P - The payload type accepted by the effect
 *
 * @param ctx - The context containing the registered effect handler
 * @param name - The effect name (key) to invoke
 * @param payload - The payload to deliver to the handler
 *
 * @returns A Promise that resolves once the payload is enqueued - NOT once
 *          `handleEvent` has finished processing it. Don't assume the handler's
 *          side effects (or the abort itself) have happened right after this resolves.
 */
export async function abortEffect<N extends symbol, P>(
  ctx: { [K in N]: Daemon<P, any> },
  name: N,
  payload: P,
): Promise<void> {
  const handler = mustHaveHandler(ctx, name);
  await handler.pushEvent(payload);
}
