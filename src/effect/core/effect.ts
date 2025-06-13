import { EventHandler } from "@on-the-ground/daemonizer";
import {
  EffectContext,
  ExtendContext,
  Payload,
  registerHandlerOnContext,
  SIGNAL_KEY,
} from "./effect_context";

export type EffectfulFn<
  Ctx extends EffectContext<string>,
  Args extends unknown[],
  O
> = (...args: [ctx: Ctx, ...Args]) => O;

export async function withEffectHandler<
  N extends string,
  P extends Payload<R>,
  R,
  PCtx extends EffectContext<string>,
  Output
>(
  pctx: PCtx,
  effectName: N,
  handleEvent: (signal: AbortSignal, payload: P) => Promise<void>,
  teardown: () => void,
  effectfulThunk: (ctx: ExtendContext<PCtx, N, P, R>) => Promise<Output>
): Promise<Output> {
  if (!pctx[SIGNAL_KEY]) throw new Error("Missing AbortSignal in context.");
  const handler = new EventHandler(pctx[SIGNAL_KEY], handleEvent, 10);
  const ctxWithHandler = registerHandlerOnContext<PCtx, N, P, R>(
    pctx,
    effectName,
    handler
  );
  try {
    return await effectfulThunk(ctxWithHandler);
  } finally {
    teardown();
    handler.close();
  }
}

export type PayloadBuilder<P extends Payload<any>> = (
  resolve: P["resolve"]
) => P;

export async function performEffect<
  Ctx extends ExtendContext<EffectContext<string>, N, P, R>,
  N extends string,
  P extends Payload<R>,
  R
>(ctx: Ctx, name: N, payloadBuilder: PayloadBuilder<P>): Promise<R> {
  return new Promise(async (resolve) => {
    const payload = payloadBuilder(resolve);
    await ctx[name].pushEvent(payload);
  });
}
