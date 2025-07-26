import type { Daemon } from "@on-the-ground/daemonizer";
import {
  performEffect,
  withResumableEffectHandler,
  type EffectContextWithSignal,
  type Resolvable,
} from "@on-the-ground/effect";
import { expectDuck, type QuackDSL } from "@on-the-ground/quackquack";

const EFFECT_DEPENDENCY = "effect_dependency" as const;

export type Payload<Messages extends string = string> = {
  role: { [K in Messages]: QuackDSL };
  call: {
    name: Messages;
    args: unknown[];
  };
};

export async function withDependencyEffectHandler<
  PCtx extends EffectContextWithSignal,
  R,
  D extends object
>(
  pctx: PCtx,
  dependencies: D[],
  effectfulThunk: (ctx: PCtx & DependencyEffectContext) => Promise<void>
) {
  const handleEvent = async <Messages extends string>(
    pctx: PCtx,
    payload: DependencyPayload<R, Messages>
  ) => {
    const expectRole = expectDuck(payload.role);

    for (const dep of dependencies) {
      let duck: { [K in Messages]: (...args: any[]) => any };
      try {
        duck = expectRole(
          dep as { [x in keyof typeof payload.role]: (...args: any[]) => any }
        );
      } catch (e) {
        continue;
      }

      if (!(payload.call.name in duck)) continue;

      const maybeFn = duck[payload.call.name];

      if (typeof maybeFn !== "function") continue;

      try {
        const result = await maybeFn(...payload.call.args);
        return payload.resolve(result);
      } catch (e) {
        console.debug(`Error calling ${payload.call.name} on dependency:`, e);
        return payload.resolve(null);
      }
    }

    if (isDependencyEffectContext(pctx)) {
      const result = await dependencyEffect<R>(pctx, payload);
      return payload.resolve(result);
    }
    return payload.resolve(null);
  };

  return withResumableEffectHandler(
    pctx,
    EFFECT_DEPENDENCY,
    handleEvent,
    effectfulThunk
  );
}

export async function dependencyEffect<R>(
  ctx: DependencyEffectContext,
  payload: Payload
): Promise<R> {
  return performEffect<typeof EFFECT_DEPENDENCY, Payload, R>(
    ctx,
    EFFECT_DEPENDENCY,
    payload
  );
}

function isDependencyEffectContext(
  ctx: object
): ctx is DependencyEffectContext {
  return EFFECT_DEPENDENCY in ctx;
}

type DependencyPayload<R, K extends string = string> = Payload<K> &
  Resolvable<R | null>;

type DependencyEffectContext = {
  [K in typeof EFFECT_DEPENDENCY]: Daemon<DependencyPayload<any>, any>;
};
