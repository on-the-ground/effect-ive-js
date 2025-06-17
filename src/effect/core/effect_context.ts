import { Daemon } from "@on-the-ground/daemonizer";

export const SIGNAL_KEY = Symbol("effect-signal");

// EffectContext<K> is a map from string keys to effect handlers, with a reserved `signal` field.
// K should be a literal union of effect names to ensure type safety.
export type EffectHandlers<K extends string> = {
  [key in K]: Daemon<any>;
};
export type EffectContext<K extends string> =
  | {
      [SIGNAL_KEY]?: AbortSignal;
    }
  | ({
      [SIGNAL_KEY]?: AbortSignal;
    } & EffectHandlers<K>);

export type Resolvable<R> = {
  resolve: (value: R | PromiseLike<R>) => void;
};

// Extend an existing context with a new named handler
export type ExtendContext<
  Prev,
  N extends string,
  P extends Resolvable<R>,
  R
> = Prev & {
  [K in N]: Daemon<P>;
};

// A truly empty context (compile-time guarantee)
export const emptyContext: EffectContext<string> = {};

export function withSignal<K extends string>(
  ctx: EffectContext<K>,
  signal: AbortSignal
): EffectContext<K> {
  const clone = cloneContext(ctx);
  clone[SIGNAL_KEY] = signal;
  return clone;
}

// Creates a new context layer with a handler for effect `name`
export const registerHandlerOnContext = <
  PCtx extends EffectContext<string>,
  N extends string,
  P extends Resolvable<R>,
  R
>(
  ctx: PCtx,
  name: N,
  handler: Daemon<P>
): ExtendContext<PCtx, N, P, R> => {
  const clone = cloneContext(ctx);
  clone[name] = handler;
  return clone;
};

function cloneContext<K extends string>(ctx: EffectContext<K>) {
  // Create a new object with the same prototype as ctx
  // This ensures that the new context has the same type as the original
  // but is a distinct object.
  // Using Object.create to maintain the prototype chain
  // and avoid copying properties directly.
  return Object.create(ctx);
}
