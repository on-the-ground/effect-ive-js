import { Daemon, mergeAbortSignals } from "@on-the-ground/daemonizer";
import {
  mustHaveSignal,
  registerHandlerOnContext,
  type EffectContext,
  type ExtendContext,
} from "@on-the-ground/effect-context";

export async function withAbortiveEffectHandler<
  N extends string,
  P,
  PCtx extends EffectContext<string>
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  effectfulThunk: (ctx: ExtendContext<PCtx, N, P>) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const controller = new AbortController();
  const parentSignal = mustHaveSignal(pctx);
  const mergedSignal: AbortSignal = mergeAbortSignals([
    controller.signal,
    parentSignal,
  ]);

  const handler = new Daemon(
    mergedSignal,
    async (signal: AbortSignal, payload: P) => {
      await handleEvent(signal, payload);
      controller.abort();
    },
    10
  );
  const ctxWithHandler = registerHandlerOnContext<PCtx, N, P>(
    pctx,
    effectName,
    handler
  );
  try {
    await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

export async function abortEffect<
  Ctx extends ExtendContext<EffectContext<string>, N, P>,
  N extends string,
  P
>(ctx: Ctx, name: N, payload: P) {
  await ctx[name].pushEvent(payload);
}

export async function withFireAndForgetEffectHandler<
  N extends string,
  P,
  PCtx extends EffectContext<string>
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  effectfulThunk: (ctx: ExtendContext<PCtx, N, P>) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const signal = mustHaveSignal(pctx);
  const handler = new Daemon(signal, handleEvent, 10);
  const ctxWithHandler = registerHandlerOnContext<PCtx, N, P>(
    pctx,
    effectName,
    handler
  );
  try {
    return await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

export async function fireAndForgetEffect<
  Ctx extends ExtendContext<EffectContext<string>, N, P>,
  N extends string,
  P
>(ctx: Ctx, name: N, payload: P) {
  await ctx[name].pushEvent(payload);
}

/* export type EffectfulFn<
  Ctx extends EffectContext<string>,
  Args extends unknown[],
  O
> = (...args: [ctx: Ctx, ...Args]) => O;
 */

export type Resolvable<R> = {
  resolve: (value: R | PromiseLike<R>) => void;
};

export async function withResumableEffectHandler<
  N extends string,
  P extends Resolvable<R>,
  R,
  PCtx extends EffectContext<string>
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  effectfulThunk: (ctx: ExtendContext<PCtx, N, P>) => Promise<void>,
  teardown?: () => void
): Promise<void> {
  const signal = mustHaveSignal(pctx);
  const handler = new Daemon(signal, handleEvent, 10);
  const ctxWithHandler = registerHandlerOnContext<PCtx, N, P>(
    pctx,
    effectName,
    handler
  );
  try {
    return await effectfulThunk(ctxWithHandler);
  } finally {
    if (teardown) teardown();
    handler.close();
  }
}

export type ResolvableBuilder<P extends Resolvable<any>> = (
  resolve: P["resolve"]
) => P;

export async function performEffect<
  Ctx extends ExtendContext<EffectContext<string>, N, P>,
  N extends string,
  P extends Resolvable<R>,
  R
>(ctx: Ctx, name: N, payloadBuilder: ResolvableBuilder<P>): Promise<R> {
  return new Promise(async (resolve) => {
    const payload = payloadBuilder(resolve);
    await ctx[name].pushEvent(payload);
  });
}
