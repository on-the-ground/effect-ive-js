import type { Daemon } from "@on-the-ground/daemonizer";
import { SIGNAL_KEY } from "@on-the-ground/daemonizer";

export type EffectContextWithSignal = Record<string, Daemon<any, any>> & {
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
  N extends string,
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
 * Retrieves the handler for the given effect name.
 */
export function mustHaveHandler<N extends string, P>(
  ctx: { [K in N]: Daemon<P, any> },
  name: N
): Daemon<P, any> {
  const handler = ctx[name];
  if (!handler) {
    throw new Error(
      `No handler registered for effect "${name}". Use registerHandlerOnContext(...) to attach one.`
    );
  }
  return handler;
}
