import type { Daemon } from "@on-the-ground/daemonizer";

const SIGNAL_KEY = Symbol("effect-signal");

export type EffectContextWithSignal = Record<string, Daemon<any>> & {
  [SIGNAL_KEY]: AbortSignal;
};

/**
 * Retrieves the AbortSignal from the context, or throws if missing.
 */
export function mustHaveSignal(ctx: {
  [SIGNAL_KEY]: AbortSignal;
}): AbortSignal {
  const signal = ctx[SIGNAL_KEY];
  if (!signal) throw new Error("Missing AbortSignal in context.");
  return signal;
}

/**
 * An empty effect context.
 */
export const emptyContext: {} = {};

/**
 * Returns a new context with the given AbortSignal attached.
 */
export function withSignal<Ctx extends object>(
  signal: AbortSignal,
  ctx: Ctx
): Ctx & { [SIGNAL_KEY]: AbortSignal } {
  const clone = cloneContext(ctx) as Ctx & { [SIGNAL_KEY]: AbortSignal };
  clone[SIGNAL_KEY] = signal;
  return clone;
}

/**
 * Adds a new effect handler to the context.
 */
export function registerHandlerOnContext<Ctx, N extends string, P>(
  name: N,
  handler: Daemon<P>,
  ctx: Ctx
): Ctx & { [K in N]: Daemon<P> } {
  return {
    ...ctx,
    [name]: handler,
  } as Ctx & { [K in N]: Daemon<P> };
}

/**
 * Clones the given effect context.
 */
function cloneContext<T extends object | null>(ctx: T): T {
  return Object.create(ctx);
}

/**
 * Retrieves the handler for the given effect name.
 */
export function mustHaveHandler<N extends string, P>(
  ctx: { [K in N]: Daemon<P> },
  name: N
): Daemon<P> {
  const handler = ctx[name];
  if (!handler) {
    throw new Error(
      "Missing AbortSignal in context. Use withSignal to attach one."
    );
  }
  return handler;
}
