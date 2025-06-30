import { describe, it, expect } from "vitest";
import { withRaiseEffectHandler, raiseEffect } from "../src/effect";
import { withSignal, emptyContext } from "@on-the-ground/effect";

describe("withRaiseEffectHandler", () => {
  it("should return void when no error is raised", async () => {
    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {}
    );
    expect(result).toBeUndefined();
  });

  it("should return the raised error", async () => {
    const raised = new Error("expected failure");
    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        await raiseEffect(ctx, raised);
      }
    );
    expect(result).toBe(raised);
  });
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("raiseEffect across async call boundaries", () => {
  it("should propagate raised error through multiple async functions", async () => {
    class CustomError extends Error {}

    async function level3(ctx: any) {
      await delay(10);
      await raiseEffect(ctx, new CustomError("raised at level 3"));
    }

    async function level2(ctx: any) {
      await delay(10);
      await level3(ctx);
    }

    async function level1(ctx: any) {
      await delay(10);
      await level2(ctx);
    }

    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        await level1(ctx);
      }
    );

    expect(result).toBeInstanceOf(CustomError);
    expect((result as CustomError).message).toBe("raised at level 3");
  });

  it("should return void if no error was raised", async () => {
    async function noRaise(ctx: any) {
      await delay(10);
    }

    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        await noRaise(ctx);
      }
    );

    expect(result).toBeUndefined();
  });
});
