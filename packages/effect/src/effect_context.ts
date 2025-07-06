import type { Daemon } from "@on-the-ground/daemonizer";
import { SIGNAL_KEY } from "@on-the-ground/daemonizer";

export type EffectContextWithSignal = Record<string, Daemon<any, any>> & {
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
 * Registers a named effect handler in the given context.
 * The resulting context includes the new handler in addition to the existing ones.
 */
export function registerHandlerOnContext<
  Ctx extends EffectContextWithSignal,
  N extends string,
  P
>(
  name: N,
  handler: Daemon<P, Ctx>,
  ctx: Ctx
): Ctx & { [K in N]: Daemon<P, Ctx> } {
  return {
    ...ctx,
    [name]: handler,
  } as Ctx & { [K in N]: Daemon<P, Ctx> };
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
