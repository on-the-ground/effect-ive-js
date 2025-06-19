import { Daemon } from "@on-the-ground/daemonizer";
import {
  mustHaveSignal,
  registerHandlerOnContext,
  type EffectContext,
  type ExtendContext,
} from "@on-the-ground/effect-context";

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
    await effectfulThunk(ctxWithHandler);
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
