import { describe, it, expect } from "vitest";
import { withRaiseEffectHandler, raiseEffect } from "../src/effect";
import { withSignal, emptyContext } from "@on-the-ground/effect-context";

describe("withRaiseEffectHandler", () => {
  it("should return void when no error is raised", async () => {
    const result = await withRaiseEffectHandler(
      withSignal(emptyContext, new AbortController().signal),
      async (ctx) => {
        // simulate normal execution without raise
      }
    );
    expect(result).toBeUndefined();
  });

  it("should return the raised error", async () => {
    const raised = new Error("expected failure");
    const result = await withRaiseEffectHandler(
      withSignal(emptyContext, new AbortController().signal),
      async (ctx) => {
        await raiseEffect(ctx, raised);
      }
    );
    expect(result).toBe(raised);
  });
});
