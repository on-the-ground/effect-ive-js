import {type Proxied, startProxy} from "@on-the-ground/proxxy";
import {type EffectContextWithSignal, getSignal, registerEffectOnContext} from "./effect_context";
import type {EffectToken, ExpectedInterface} from "./effect_token";

type Disposable = { [Symbol.dispose]?: () => unknown };

async function disposeIfPossible(Ctor: new (...args: any[]) => object, proxy: object): Promise<void> {
    if (typeof (Ctor.prototype as Disposable)[Symbol.dispose] !== "function") return;
    await (proxy as Disposable)[Symbol.dispose]?.();
}

/**
 * Registers a proxxy-started proxy on the context under `effectToken`, runs `thunk`
 * with that context, then disposes and closes the proxy on the way out. Each method
 * call returns a real Promise: await it to behave like a resumable effect, or leave
 * it unawaited (optionally `.catch(...)`) for fire-and-forget usage.
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

