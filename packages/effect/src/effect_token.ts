/**
 * Internal symbol used to attach the expected interface to an effect token type.
 */
export const expected = Symbol("expected");

/**
 * A branded symbol type used to identify a strongly typed effect entry in a context.
 *
 * @template Expected - The interface that the effect is expected to implement.
 */
export type EffectToken<Expected> = symbol & { [expected]: Expected };

/**
 * Resolves the expected interface for a given effect token.
 *
 * @template Token - The effect token to inspect.
 */
export type ExpectedInterface<Token> = Token extends EffectToken<infer Expected> ? Expected : never;

/**
 * Creates a typed effect token from a descriptive name.
 *
 * @template Expected - The interface the token is expected to expose.
 * @param name - Human-readable name used for the created symbol.
 * @returns A branded symbol that can be used as an effect token.
 */
export const effectTokenOf = <Expected>(name: string): EffectToken<Expected> => Symbol(name) as EffectToken<Expected>;