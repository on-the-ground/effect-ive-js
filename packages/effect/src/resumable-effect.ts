import { Daemon } from "@on-the-ground/daemonizer";
import {
  mustHaveHandler,
  mustHaveSignal,
  registerHandlerOnContext,
  type EffectContext,
  type EffectContextWithSignal,
} from "../../internal/effect_context";

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
export async function withResumableEffectHandler<N extends string, P>(
  pctx: EffectContextWithSignal<Record<string, any>>,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  effectfulThunk: (ctx: EffectContext<{ [K in N]: P }>) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const signal = mustHaveSignal(pctx);
  const handler = new Daemon(signal, handleEvent, 10);
  const ctxWithHandler = registerHandlerOnContext(effectName, handler, pctx);
  try {
    return await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

/**
 * A builder function that constructs a Resolvable payload,
 * given the resolve function.
 */
export type ResolvableBuilder<P extends Resolvable<any>> = (
  resolve: P["resolve"]
) => P;

/**
 * Performs a **resumable effect** by building a payload that contains a `resolve` function,
 * pushing it into the appropriate daemon, and waiting for it to be resolved.
 *
 * @template N Effect name (string literal)
 * @template P Payload type with `resolve`
 * @template R Resolved result type
 *
 * @param ctx The context containing the effect daemon
 * @param name The name of the effect to perform
 * @param payloadBuilder A builder that receives a resolve function and returns a payload
 * @returns A Promise that resolves when `resolve()` is called inside the handler
 */
export async function performEffect<
  N extends string,
  P extends Resolvable<R>,
  R
>(
  ctx: EffectContext<{ [K in N]: P }>,
  name: N,
  payloadBuilder: ResolvableBuilder<P>
): Promise<R> {
  return new Promise(async (resolve) => {
    const payload = payloadBuilder(resolve);
    const handler = mustHaveHandler(ctx, name);
    await handler.pushEvent(payload);
  });
}
