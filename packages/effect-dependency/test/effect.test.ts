import { describe, expect, it } from "@jest/globals";
import { dependencyEffect, withDependencyEffectHandler } from "../src/effect";
import { quackable } from "@on-the-ground/quackquack";
import { withSignal, emptyContext } from "@on-the-ground/effect";

function createDaemonContext() {
  return withSignal(new AbortController().signal, emptyContext);
}

describe("DependencyEffect - Integration Style", () => {
  it("delegates to matching dependency", async () => {
    const greeter = {
      greet: quackable("(name: string) => string")(
        (name: string) => `Hello, ${name}`
      ),
    };

    const pctx = createDaemonContext();

    await withDependencyEffectHandler(pctx, [greeter], async (ctx) => {
      const resolved = await dependencyEffect(ctx, {
        role: { greet: "(name: string) => string" },
        call: { name: "greet", args: ["Juno"] },
      });
      expect(resolved).toBe("Hello, Juno");
    });
  });

  it("delegates to matching dependency without signature", async () => {
    const greeter = {
      greet: (name: string) => `Hello, ${name}`,
    };

    const pctx = createDaemonContext();

    await withDependencyEffectHandler(pctx, [greeter], async (ctx) => {
      const resolved = await dependencyEffect(ctx, {
        role: { greet: "(name: string) => string" },
        call: { name: "greet", args: ["Juno"] },
      });
      expect(resolved).toBe("Hello, Juno");
    });
  });

  it("skips non-matching dependency and returns null", async () => {
    const dep = {
      shout: (n: number) => `!!${n}`,
    };

    const pctx = createDaemonContext();

    await withDependencyEffectHandler(pctx, [dep], async (ctx) => {
      const resolved = await dependencyEffect(ctx, {
        role: { greet: "(name: string) => string" },
        call: { name: "greet", args: ["World"] },
      });
      expect(resolved).toBe(null);
    });
  });

  it("skips dependency with different signature and returns null", async () => {
    const dep = {
      greet: (n: number) => `!!${n}`,
    };

    const pctx = createDaemonContext();

    await withDependencyEffectHandler(pctx, [dep], async (ctx) => {
      const resolved = await dependencyEffect(ctx, {
        role: { greet: "(name: string) => string" },
        call: { name: "greet", args: [1] },
      });
      expect(resolved).toBe(null);
    });
  });

  it("calls the first matching dependency only", async () => {
    const callLog: string[] = [];

    const dep1 = {
      compute: quackable("(x: number) => number")((x) => {
        callLog.push("dep1");
        return x + 1;
      }),
    };

    const dep2 = {
      compute: quackable("(x: number) => number")((x) => {
        callLog.push("dep2");
        return x + 2;
      }),
    };

    const pctx = createDaemonContext();

    await withDependencyEffectHandler(pctx, [dep1, dep2], async (ctx) => {
      const resolved = await dependencyEffect(ctx, {
        role: { compute: "(x: number) => number" },
        call: { name: "compute", args: [10] },
      });
      expect(callLog).toEqual(["dep1"]);
      expect(resolved).toBe(11);
    });
  });
});
