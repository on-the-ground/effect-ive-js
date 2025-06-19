import type { Daemon } from "@on-the-ground/daemonizer";

const SIGNAL_KEY = Symbol("effect-signal");

export type EffectContext<Spec extends Record<string, any>> = {
  [K in keyof Omit<Spec, typeof SIGNAL_KEY>]: Daemon<Spec[K]>;
} & { [SIGNAL_KEY]?: AbortSignal };

export type EffectContextWithSignal<Spec extends Record<string, any>> = {
  [K in keyof Omit<Spec, typeof SIGNAL_KEY>]: Daemon<Spec[K]>;
} & { [SIGNAL_KEY]: AbortSignal };

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
export const emptyContext: EffectContext<{}> = {};

/**
 * Returns a new context with the given AbortSignal attached.
 */
export function withSignal<Spec extends Record<string, any>>(
  signal: AbortSignal,
  ctx: EffectContext<Spec>
): EffectContextWithSignal<Spec> {
  const clone = cloneContext(ctx);
  clone[SIGNAL_KEY] = signal;
  return clone as EffectContextWithSignal<Spec>;
}

export const _withSignal =
  (signal: AbortSignal) =>
  <Spec extends Record<string, any>>(
    ctx: EffectContext<Spec>
  ): EffectContextWithSignal<Spec> =>
    withSignal(signal, ctx);

/**
 * Adds a new effect handler to the context.
 */
export function registerHandlerOnContext<
  Spec extends Record<string, any>,
  K extends string,
  P
>(
  name: K,
  handler: Daemon<P>,
  ctx: EffectContext<Spec>
): EffectContext<Spec & { [Key in K]: P }> {
  const clone = cloneContext(ctx);
  (clone as any)[name] = handler;
  return clone as EffectContext<Spec & { [Key in K]: P }>;
}

export const _registerHandlerOnContext =
  <K extends string, P>(name: K, handler: Daemon<P>) =>
  <Hdlr extends Record<string, any>>(
    ctx: EffectContext<Hdlr>
  ): EffectContext<Hdlr & { [Key in K]: P }> =>
    registerHandlerOnContext(name, handler, ctx);

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
  ctx: EffectContext<{ [K in N]: P }>,
  name: N
): Daemon<P> {
  const handler = ctx[name];
  if (!handler) {
    throw new Error(`Missing handler for effect "${String(name)}"`);
  }
  return handler;
}
