import { Daemon } from "@on-the-ground/daemonizer";
import {
  mustHaveHandler,
  mustHaveSignal,
  registerHandlerOnContext,
  type EffectContextWithSignal,
} from "./effect_context";

/**
 * Registers a "fire-and-forget" style effect handler in the given context,
 * runs the provided effectful thunk, and ensures proper teardown afterward.
 *
 * @template N - The name of the effect (string literal).
 * @template P - The payload type the effect will handle.
 *
 * @param pctx - A parent context that includes an AbortSignal (required).
 * @param effectName - The name of the effect to register in the context.
 * @param handleEvent - The handler function to execute on each incoming payload.
 * @param effectfulThunk - The main logic to run within the context that includes the effect.
 * @param teardown - (Optional) A cleanup function to run after the thunk completes.
 */

export async function withFireAndForgetEffectHandler<
  PCtx extends EffectContextWithSignal,
  N extends string,
  P
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  effectfulThunk: (ctx: PCtx & { [K in N]: Daemon<P> }) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const signal = mustHaveSignal(pctx);
  const handler = new Daemon(signal, handleEvent, 10);
  const ctxWithHandler = registerHandlerOnContext(effectName, handler, pctx);

  try {
    await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

/**
 * Triggers a "fire-and-forget" effect by pushing a payload to its handler.
 *
 * @template N - The name of the effect (string literal).
 * @template P - The type of the payload to send.
 *
 * @param ctx - A context object that includes a Daemon for the given effect.
 * @param name - The effect name (must be a key in `ctx`).
 * @param payload - The payload to push to the effect handler.
 */
export async function fireAndForgetEffect<N extends string, P>(
  ctx: { [K in N]: Daemon<P> },
  name: N,
  payload: P
): Promise<void> {
  const handler = mustHaveHandler(ctx, name);
  await handler.pushEvent(payload);
}
