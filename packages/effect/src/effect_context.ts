import { SIGNAL_KEY } from "@on-the-ground/daemonizer";

/**
 * Context shape used by this package: every context must expose an `AbortSignal`
 * at the well-known daemon signal key.
 */
export type EffectContextWithSignal = {
  [SIGNAL_KEY]: AbortSignal;
};

/**
 * A minimal context object with no handlers attached.
 */
export const emptyContext: {} = {};

/**
 * Returns a new context that inherits from the supplied parent context and carries
 * the provided abort signal.
 *
 * @template PCtx - The parent context type.
 * @param signal - Abort signal to attach to the context.
 * @param pctx - Existing context used as the parent object.
 * @returns A new context that carries the signal and inherits from `pctx`.
 */
export function withSignal<PCtx extends object>(
  signal: AbortSignal,
  pctx: PCtx,
): PCtx & { [SIGNAL_KEY]: AbortSignal } {
  const ctx = cloneContext(pctx) as PCtx & { [SIGNAL_KEY]: AbortSignal };
  ctx[SIGNAL_KEY] = signal;
  return ctx;
}

/**
 * Returns a shallow clone of the supplied context via prototype inheritance.
 *
 * This preserves the parent/child relationship so handlers can be looked up
 * through outer scopes when a key is not present in the current context.
 */
function cloneContext<T extends object | null>(ctx: T): T {
  return Object.create(ctx);
}

/**
 * Returns the abort signal attached to the context.
 *
 * @param ctx - Context carrying the daemon signal.
 * @returns The `AbortSignal` attached to the context.
 */
export function getSignal(ctx: EffectContextWithSignal): AbortSignal {
  return ctx[SIGNAL_KEY];
}

/**
 * Registers an arbitrary value (such as a proxied effect handler) under a symbol key.
 *
 * @template PCtx - The parent context type.
 * @template N - The symbol key used for the effect.
 * @template T - The value type to expose on the context.
 * @param name - Symbol key for the effect entry.
 * @param effect - Value to register under the key.
 * @param pctx - Parent context to extend.
 * @returns A new context containing the registered effect.
 */
export function registerEffectOnContext<
  PCtx extends EffectContextWithSignal,
  N extends symbol,
  T,
>(name: N, effect: T, pctx: PCtx): PCtx & { [K in N]: T } {
  const ctx = cloneContext(pctx) as PCtx & { [K in N]: T };
  (ctx as Record<symbol, T>)[name] = effect;
  return ctx;
}

/**
 * Retrieves a registered daemon handler or throws if it is missing.
 *
 * @template N - The symbol key used for the handler.
 * @template P - Payload type accepted by the handler.
 * @param ctx - Context containing the handler.
 * @param name - Symbol key of the handler to fetch.
 * @returns The registered handler.
 */
export function mustHaveHandler<N extends symbol, T>(
  ctx: { [K in N]: T },
  name: N,
): T {
  const handler = ctx[name];
  if (!handler) {
    throw new Error(
      `No handler registered for effect ${String(name)}. Use registerEffectOnContext(...) to attach one.`,
    );
  }
  return handler;
}
