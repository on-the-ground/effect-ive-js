import {type Proxied, startProxy} from "@on-the-ground/proxxy";
import {type EffectContextWithSignal, getSignal, registerEffectOnContext} from "./effect_context";
import type {EffectToken, ExpectedInterface} from "./effect_token";

type Disposable = { [Symbol.dispose]?: () => unknown };

async function disposeIfPossible(Ctor: new (...args: any[]) => object, proxy: object): Promise<void> {
    if (typeof (Ctor.prototype as Disposable)[Symbol.dispose] !== "function") return;
    await (proxy as Disposable)[Symbol.dispose]?.();
}

/**
 * Creates a proxy-backed effect handler and returns a small runner API.
 *
 * The returned `run` function starts a proxied handler instance, attaches it to
 * the provided context under the given effect token, executes the supplied thunk,
 * and then disposes and closes the proxy before returning. Awaiting the thunk
 * preserves resumable semantics, while leaving the returned promise unawaited is
 * suitable for fire-and-forget usage.
 *
 * @template PCtx - Parent context type, constrained to carry an `AbortSignal`.
 * @template Token - The effect token used to expose the proxy on the context.
 * @param pctx - Parent context that already carries an abort signal.
 * @param effectToken - Token that will receive the proxied handler in the context.
 * @param Ctor - Constructor for the interface implementation that should be proxied.
 * @returns A runner object with a `run` method that executes the thunk with the augmented context.
 */
export const withEffectHandler = <
    PCtx extends EffectContextWithSignal,
    Token extends EffectToken<any>
>(
    pctx: PCtx,
    effectToken: Token,
    Ctor: new () => ExpectedInterface<Token>,
) => ({
    run: async <R>(thunk: (ctx: PCtx & { [K in Token]: Proxied<ExpectedInterface<Token>> }) => Promise<R>): Promise<R> => {
        const {proxy, close} = startProxy(Ctor, getSignal(pctx));
        const ctx = registerEffectOnContext(effectToken, proxy, pctx);
        try {
            return await thunk(ctx);
        } finally {
            await disposeIfPossible(Ctor, proxy);
            await close();
        }
    },
});

