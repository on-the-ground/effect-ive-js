import { describe, it, expect } from "@jest/globals";
import { withRaiseEffectHandler, raiseEffect } from "../src";
import { withSignal, emptyContext } from "@on-the-ground/effect";

describe("withRaiseEffectHandler", () => {
  it("should return void when no error is raised", async () => {
    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async () => {},
    );
    expect(result).toBeUndefined();
  });

  it("should return the raised error", async () => {
    const raised = new Error("expected failure");
    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        raiseEffect(ctx, raised);
      },
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
      raiseEffect(ctx, new CustomError("raised at level 3"));
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
      },
    );

    expect(result).toBeInstanceOf(CustomError);
    expect((result as CustomError).message).toBe("raised at level 3");
  });

  it("should return void if no error was raised", async () => {
    async function noRaise() {
      await delay(10);
    }

    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async () => {
        await noRaise();
      },
    );

    expect(result).toBeUndefined();
  });
});

describe("RaiseMode", () => {
  it("urgent (default) returns as soon as raised, abandoning the rest of effectfulThunk", async () => {
    const sideEffect = { ranAfterRaise: false };
    const raised = new Error("urgent failure");

    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        raiseEffect(ctx, raised);
        await delay(20);
        sideEffect.ranAfterRaise = true;
      },
    );

    expect(result).toBe(raised);
    expect(sideEffect.ranAfterRaise).toBe(false);

    // drain the abandoned continuation so it doesn't bleed into the next test
    await delay(30);
  });

  it("graceful waits for effectfulThunk to actually finish before returning the raised error", async () => {
    const sideEffect = { ranAfterRaise: false };
    const raised = new Error("graceful failure");

    const result = await withRaiseEffectHandler(
      withSignal(new AbortController().signal, emptyContext),
      async (ctx) => {
        raiseEffect(ctx, raised);
        await delay(20);
        sideEffect.ranAfterRaise = true;
      },
      "graceful",
    );

    expect(result).toBe(raised);
    expect(sideEffect.ranAfterRaise).toBe(true);
  });
});
