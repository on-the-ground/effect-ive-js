import type { Daemon } from "@on-the-ground/daemonizer";

const SIGNAL_KEY = Symbol("effect-signal");

/**
 * A map from effect name strings to effect handlers.
 * Each key in K maps to a `Daemon<any>`, which acts as an effect handler.
 *
 * @template K A union of string literal effect names
 */
export type EffectHandlers<K extends string> = {
  [key in K]: Daemon<any>;
};

/**
 * Represents an effect context, which is an object containing:
 * - an optional AbortSignal for cancellation
 * - and a mapping from effect names to their corresponding handlers
 *
 * The union type allows for flexibility in context structure while maintaining type safety.
 *
 * @template K A union of string literal effect names
 */
export type EffectContext<K extends string> =
  /* | {
      [SIGNAL_KEY]?: AbortSignal;
    } */
  | {
      [SIGNAL_KEY]?: AbortSignal;
    } & EffectHandlers<K>;

/**
 * Retrieves the AbortSignal from the given effect context.
 * Throws an error if the signal is missing.
 *
 * @param ctx The effect context
 * @returns The AbortSignal from the context
 * @throws If the AbortSignal is not found in the context
 */
export function mustHaveSignal(ctx: EffectContext<string>): AbortSignal {
  const signal = ctx[SIGNAL_KEY];
  if (!signal) throw new Error("Missing AbortSignal in context.");
  return signal;
}

/**
 * Extends an existing effect context with a new named handler.
 * Used to add a new effect handler to a context in a type-safe way.
 *
 * @template Prev The previous context type
 * @template N The new effect name to add
 * @template P The payload type handled by the new Daemon
 */
export type ExtendContext<Prev, N extends string, P> = Prev & {
  [K in N]: Daemon<P>;
};

/**
 * An empty effect context, guaranteed to be valid at compile time.
 */
export const emptyContext: EffectContext<string> = {};

/**
 * Returns a new context with the given AbortSignal merged in.
 * Useful for layering cancellation behavior into an effect context.
 *
 * @template K A union of effect names in the context
 * @param ctx The current context
 * @param signal The AbortSignal to attach
 * @returns A cloned context with the signal included
 */
export function withSignal<K extends string>(
  ctx: EffectContext<K>,
  signal: AbortSignal
): EffectContext<K> {
  const clone = cloneContext(ctx);
  clone[SIGNAL_KEY] = signal;
  return clone;
}

/**
 * Creates a new context by adding a named effect handler to an existing context.
 *
 * @template PCtx The parent context type
 * @template N The name of the new effect
 * @template P The payload type handled by the new effect
 * @param ctx The existing context to extend
 * @param name The name of the effect to register
 * @param handler The handler (Daemon) for the effect
 * @returns A new extended context containing the new handler
 */
export const registerHandlerOnContext = <
  PCtx extends EffectContext<string>,
  N extends string,
  P
>(
  ctx: PCtx,
  name: N,
  handler: Daemon<P>
): ExtendContext<PCtx, N, P> => {
  const clone = cloneContext(ctx);
  clone[name] = handler;
  return clone;
};

/**
 * Clones the given effect context.
 * This preserves the prototype chain while creating a new, mutable copy.
 *
 * @template K The key union of the context
 * @param ctx The context to clone
 * @returns A new object with the same prototype and properties as `ctx`
 */
function cloneContext<K extends string>(ctx: EffectContext<K>) {
  return Object.create(ctx);
}
