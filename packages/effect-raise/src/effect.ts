import {
  withAbortiveEffectHandler,
  abortEffect,
} from "@on-the-ground/effect-abortive";
import type {
  EffectContext,
  ExtendContext,
} from "@on-the-ground/effect-context";

const effectName = "effect_raise" as const;

/**
 * Wraps an asynchronous computation with a `raise` effect handler.
 *
 * This allows the wrapped `effectfulThunk` to perform a `raiseEffect(err)` call
 * that will short-circuit the computation and return the given error.
 *
 * Internally, this is implemented by combining:
 * - an abortive effect handler that listens for a raised error,
 * - and a Promise.race to capture the first raised error or successful completion.
 *
 * @template PCtx The base context type.
 * @template E The error type that can be raised.
 * @param pctx The parent effect context.
 * @param effectfulThunk A computation that may call `raiseEffect` to raise an error.
 * @returns A Promise that resolves to either:
 *   - `void` if the computation completed without raising,
 *   - or the raised error of type `E`.
 */
export async function withRaiseEffectHandler<
  PCtx extends EffectContext<string>,
  E extends Error
>(
  pctx: PCtx,
  effectfulThunk: (
    ctx: ExtendContext<PCtx, typeof effectName, E>
  ) => Promise<void>
): Promise<Result<E>> {
  let resolve: (value: E | PromiseLike<E>) => void;
  const errPromise = new Promise<E>((r) => (resolve = r));
  const handleEvent = async (_: AbortSignal, error: E): Promise<void> =>
    resolve(error);

  return await Promise.race([
    withAbortiveEffectHandler(pctx, "raise", handleEvent, effectfulThunk),
    errPromise,
  ]);
}

/**
 * Triggers the `raise` effect with the given error value.
 *
 * This will cause the nearest enclosing `withRaiseEffectHandler` to short-circuit
 * and return the given error.
 *
 * @template E The error type to raise.
 * @param ctx An extended context that includes the `raise` handler.
 * @param err The error instance to raise.
 * @returns A Promise that resolves when the effect is handled.
 */
export async function raiseEffect<E extends Error>(
  ctx: ExtendContext<EffectContext<string>, typeof effectName, E>,
  err: E
) {
  return abortEffect(ctx, effectName, err);
}

/**
 * The result type of a computation wrapped with `withRaiseEffectHandler`.
 * - `void` means no error was raised.
 * - `E` is the error that was raised and captured.
 */
export type Result<E extends Error> = E | void;
