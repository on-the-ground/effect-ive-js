import {
  type AbortiveEffectHandler,
  type EffectContextWithSignal,
  withAbortiveEffectHandler,
} from "@on-the-ground/effect";

const RaiseEffect: unique symbol = Symbol("effect_raise");

/**
 * Controls how a raise is allowed to affect the surrounding `effectfulThunk`:
 * - `"urgent"` (default) - race the raise against `effectfulThunk`. The moment
 *   an error is raised, `withRaiseEffectHandler` returns it immediately and
 *   whatever `effectfulThunk` was still doing is abandoned, not awaited.
 * - `"graceful"` - never abandon `effectfulThunk`. The abort signal still
 *   fires the instant something is raised (so cooperative cleanup downstream
 *   can react to it), but `withRaiseEffectHandler` itself waits for
 *   `effectfulThunk` to actually finish before returning the raised error.
 *
 * Same SIGTERM/SIGKILL idea: both stop things, "urgent" doesn't wait for
 * anyone to clean up, "graceful" does.
 */
export type RaiseMode = "urgent" | "graceful";

/**
 * Wraps an asynchronous computation with a `raise` effect handler.
 *
 * This allows the wrapped `effectfulThunk` to perform a `raiseEffect(err)` call
 * that will short-circuit the computation and return the given error.
 *
 * Internally, this is implemented by combining:
 * - an abortive effect handler that listens for a raised error,
 * - and, in `"urgent"` mode, a Promise.race to capture the first raised error
 *   or successful completion ahead of `effectfulThunk` actually finishing.
 *
 * @template PCtx The base context type.
 * @template E The error type that can be raised.
 * @param pctx The parent effect context.
 * @param effectfulThunk A computation that may call `raiseEffect` to raise an error.
 * @param mode See {@link RaiseMode}. Defaults to `"urgent"`.
 * @returns A Promise that resolves to either:
 *   - `void` if the computation completed without raising,
 *   - or the raised error of type `E`.
 */
export async function withRaiseEffectHandler<
  PCtx extends EffectContextWithSignal,
  E extends Error,
>(
  pctx: PCtx,
  effectfulThunk: (ctx: {
    [K in typeof RaiseEffect]: AbortiveEffectHandler<E>;
  }) => Promise<void>,
  mode: RaiseMode = "urgent",
): Promise<Result<E>> {
  let raised: E | undefined;
  let resolve: (value: E | PromiseLike<E>) => void;
  const errPromise = new Promise<E>((r) => (resolve = r));
  const handleEvent = async (_: PCtx, error: E): Promise<void> => {
    raised = error;
    resolve(error);
  };

  const runPromise = withAbortiveEffectHandler(
    pctx,
    RaiseEffect,
    handleEvent,
  ).run(effectfulThunk);

  if (mode === "graceful") {
    await runPromise;
    return raised;
  }

  return await Promise.race([runPromise, errPromise]);
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
export function raiseEffect<E extends Error>(
  ctx: { [K in typeof RaiseEffect]: AbortiveEffectHandler<E> },
  err: E,
): void {
  ctx[RaiseEffect].abort(err);
}

/**
 * The result type of a computation wrapped with `withRaiseEffectHandler`.
 * - `void` means no error was raised.
 * - `E` is the error that was raised and captured.
 */
export type Result<E extends Error> = E | void;
