import { Daemon, mergeAbortSignals } from "@on-the-ground/daemonizer";
import {
  mustHaveSignal,
  registerHandlerOnContext,
  type EffectContext,
  type ExtendContext,
} from "@on-the-ground/effect-context";

/**
 * Registers an abortive effect handler into the given context, executes the provided
 * asynchronous thunk, and ensures proper cleanup and cancellation behavior.
 *
 * This handler is designed to handle a single event. Once the event is handled,
 * the internal AbortController is triggered, propagating cancellation to the entire context.
 *
 * @template N - The name (key) of the effect to register
 * @template P - The payload type accepted by the effect handler
 * @template PCtx - The parent context type before extension
 *
 * @param pctx - The parent context, which must already include an AbortSignal
 * @param effectName - A unique string name for the effect within the context
 * @param handleEvent - The effect handler function; receives the AbortSignal and payload,
 *                      and aborts the effect scope after execution
 * @param effectfulThunk - A function that performs async logic using the extended context
 * @param teardown - (Optional) Cleanup function to be called after the thunk finishes or is aborted
 *
 * @returns A Promise that resolves after the effectfulThunk has completed or been aborted
 */
export async function withAbortiveEffectHandler<
  N extends string,
  P,
  PCtx extends EffectContext<string>
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  effectfulThunk: (ctx: ExtendContext<PCtx, N, P>) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const controller = new AbortController();
  const parentSignal = mustHaveSignal(pctx);
  const mergedSignal: AbortSignal = mergeAbortSignals([
    controller.signal,
    parentSignal,
  ]);

  const handler = new Daemon(
    mergedSignal,
    async (signal: AbortSignal, payload: P) => {
      await handleEvent(signal, payload);
      controller.abort();
    },
    10
  );
  const ctxWithHandler = registerHandlerOnContext<PCtx, N, P>(
    pctx,
    effectName,
    handler
  );
  try {
    await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

/**
 * Pushes a payload into a named effect handler within the context.
 * Intended to trigger an abortive handler registered with `withAbortiveEffectHandler`.
 *
 * @template Ctx - The context type extended with the given effect
 * @template N - The name of the effect to trigger
 * @template P - The payload type accepted by the effect
 *
 * @param ctx - The context containing the registered effect handler
 * @param name - The effect name (key) to invoke
 * @param payload - The payload to deliver to the handler
 *
 * @returns A Promise that resolves once the handler has processed the event
 */
export async function abortEffect<
  Ctx extends ExtendContext<EffectContext<string>, N, P>,
  N extends string,
  P
>(ctx: Ctx, name: N, payload: P) {
  await ctx[name].pushEvent(payload);
}
