import { Daemon } from "@on-the-ground/daemonizer";
import {
  mustHaveHandler,
  registerHandlerOnContext,
  type EffectContextWithSignal,
} from "./effect_context";

/**
 * An object that carries a resolve function, used to resume control flow.
 */
export type Resolvable<R> = {
  resolve: (value: R | PromiseLike<R>) => void;
};

/**
 * Registers a **Resumable Effect Handler** on the provided context,
 * which can resume execution via a `resolve` function.
 *
 * @template N Effect name (string literal)
 * @template P Payload type (must extend Resolvable)
 *
 * @param pctx Parent context with AbortSignal
 * @param effectName The string name of the effect to handle
 * @param handleEvent A handler that receives the signal and payload, and performs the side effect
 * @param effectfulThunk An effectful computation that may perform the resumable effect
 * @param teardown Optional teardown logic to run after the effectful thunk completes
 */
export async function withResumableEffectHandler<
  PCtx extends EffectContextWithSignal,
  N extends string,
  P,
  R
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (ctx: PCtx, payload: P & Resolvable<R>) => Promise<void>,
  effectfulThunk: (
    ctx: PCtx & { [K in N]: Daemon<P & Resolvable<R>, PCtx> }
  ) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const handler = new Daemon(pctx, handleEvent, 10);
  const ctxWithHandler = registerHandlerOnContext(effectName, handler, pctx);
  try {
    return await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

/**
 * Performs a resumable effect by attaching a `resolve` function to the given payload
 * and pushing it into the appropriate handler.
 *
 * The payload itself does **not** need to declare or expect a `resolve` field;
 * it will be injected internally.
 *
 * @template N Effect name (string literal)
 * @template P Original payload type (without `resolve`)
 * @template R Resolved return type
 *
 * @param ctx The effect context
 * @param name The effect name to perform
 * @param payload The payload to send (does not include `resolve`)
 * @returns A Promise resolving with the value passed to `resolve()` by the handler
 */
export async function performEffect<N extends string, P, R>(
  ctx: { [K in N]: Daemon<P & Resolvable<R>, any> },
  name: N,
  payload: P
): Promise<R> {
  return new Promise<R>(async (resolve) => {
    const handler = mustHaveHandler(ctx, name);
    handler.pushEvent({
      ...payload,
      resolve,
    });
  });
}
