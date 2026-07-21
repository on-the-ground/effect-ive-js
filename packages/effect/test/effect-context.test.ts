import { describe, it, expect } from "vitest";
import {
  emptyContext,
  withSignal,
  registerHandlerOnContext,
  mustHaveHandler,
} from "../src/effect_context";
import { Daemon } from "@on-the-ground/daemonizer";

const EFF: unique symbol = Symbol("eff");

describe("effect_context prototype chaining via registerHandlerOnContext", () => {
  it("should allow access to parent-registered handler from child and grandchild contexts", () => {
    const signal = new AbortController().signal;
    const rootCtx = withSignal(signal, emptyContext);

    const handler = new Daemon(signal, async () => {});
    const parentCtx = registerHandlerOnContext(EFF, handler, rootCtx);

    const childCtx = Object.create(parentCtx);
    const grandChildCtx = Object.create(childCtx);

    expect(mustHaveHandler(parentCtx, EFF)).toBe(handler);
    expect(mustHaveHandler(childCtx, EFF)).toBe(handler);
    expect(mustHaveHandler(grandChildCtx, EFF)).toBe(handler);
  });

  it("should allow overriding handler in child context using registerHandlerOnContext", () => {
    const signal = new AbortController().signal;
    const rootCtx = withSignal(signal, emptyContext);

    const handler1 = new Daemon(signal, async () => {});
    const parentCtx = registerHandlerOnContext(EFF, handler1, rootCtx);

    const handler2 = new Daemon(signal, async () => {});
    const childCtx = registerHandlerOnContext(EFF, handler2, parentCtx);

    expect(mustHaveHandler(childCtx, EFF)).toBe(handler2);
    expect(mustHaveHandler(Object.getPrototypeOf(childCtx), EFF)).toBe(
      handler1
    );
  });
});
