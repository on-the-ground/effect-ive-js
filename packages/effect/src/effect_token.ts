export const expected = Symbol("expected");

export type EffectToken<Expected> = symbol & { [expected]: Expected };
export type ExpectedInterface<Token> = Token extends EffectToken<infer Expected> ? Expected : never;

export const effectTokenOf = <Expected>(name: string): EffectToken<Expected> => Symbol(name) as EffectToken<Expected>;