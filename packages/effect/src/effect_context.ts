import type { Daemon } from "@on-the-ground/daemonizer";
import { SIGNAL_KEY } from "@on-the-ground/daemonizer";

export type EffectContextWithSignal = {
  [SIGNAL_KEY]: AbortSignal;
};

/**
 * An empty effect context.
 */
export const emptyContext: {} = {};

/**
 * Returns a new context with the given AbortSignal attached.
 */
export function withSignal<PCtx extends object>(
  signal: AbortSignal,
  pctx: PCtx
): PCtx & { [SIGNAL_KEY]: AbortSignal } {
  const ctx = cloneContext(pctx) as PCtx & { [SIGNAL_KEY]: AbortSignal };
  ctx[SIGNAL_KEY] = signal;
  return ctx;
}

/**
 * Registers a named effect handler in the given context.
 * The resulting context includes the new handler in addition to the existing ones.
 */
export function registerHandlerOnContext<
  PCtx extends EffectContextWithSignal,
  N extends symbol,
  P
>(
  name: N,
  handler: Daemon<P, PCtx>,
  pctx: PCtx
): PCtx & { [K in N]: Daemon<P, PCtx> } {
  const ctx = cloneContext(pctx) as PCtx & { [K in N]: Daemon<P, PCtx> };
  (ctx as Record<N, Daemon<P, PCtx>>)[name] = handler;
  return ctx;
}

/**
 * Returns a shallow clone of the given context using prototype inheritance.
 * This allows effect handler fallback from outer scopes when a key is missing.
 */
function cloneContext<T extends object | null>(ctx: T): T {
  return Object.create(ctx);
}

/**
 * Returns the AbortSignal from the given context.
 */
export function getSignal(ctx: EffectContextWithSignal): AbortSignal {
    return ctx[SIGNAL_KEY];
}

/**
 * Registers an effect proxy in the given context under the given symbol key.
 */
export function registerEffectOnContext<
    PCtx extends EffectContextWithSignal,
    N extends symbol,
    T,
>(
    name: N,
    effect: T,
    pctx: PCtx
): PCtx & { [K in N]: T } {
    const ctx = cloneContext(pctx) as PCtx & { [K in N]: T };
    (ctx as Record<symbol, T>)[name] = effect;
    return ctx;
}

/**
 * Retrieves the handler for the given effect name.
 */
export function mustHaveHandler<N extends symbol, P>(
  ctx: { [K in N]: Daemon<P, any> },
  name: N
): Daemon<P, any> {
  const handler = ctx[name];
  if (!handler) {
    throw new Error(
      `No handler registered for effect ${String(name)}. Use registerHandlerOnContext(...) to attach one.`
    );
  }
  return handler;
}
