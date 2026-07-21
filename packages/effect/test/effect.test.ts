import { describe, it, expect, vi } from "vitest";
import { emptyContext, withSignal } from "../src";
import { effectTokenOf } from "../src/effect_token";
import { withEffectHandler } from "../src";

interface Logger {
    log(key: string, msg: string): void;
}

interface Greeter {
    greet(message: string): string;
}

const LogEffect = effectTokenOf<Logger>("log");
const GreeterEffect = effectTokenOf<Greeter>("greeter");

describe("withEffectHandler", () => {
    it("blocks the caller and returns the handler's result when awaited", async () => {
        const ctxWithSignal = withSignal(new AbortController().signal, emptyContext);

        await withEffectHandler(ctxWithSignal, GreeterEffect, class {
            greet(message: string): string {
                return "hello " + message;
            }
        }).run(async (ctx) => {
            const result = await ctx[GreeterEffect].greet("world");
            expect(result).toBe("hello world");
        });
    });

    it("still dispatches when the call is left unawaited (fire-and-forget usage)", async () => {
        const spy = vi.fn();
        const ctxWithSignal = withSignal(new AbortController().signal, emptyContext);
        let waitForExecution!: Promise<void>;

        await withEffectHandler(ctxWithSignal, LogEffect, class {
            log(_key: string, msg: string) { spy(msg); }
        }).run(async (ctx) => {
            waitForExecution = ctx[LogEffect].log("alice", "hello");
        });

        await waitForExecution;
        expect(spy).toHaveBeenCalledWith("hello");
    });

    it("does not dispatch after the context is aborted", async () => {
        const spy = vi.fn();
        const controller = new AbortController();
        const ctxWithSignal = withSignal(controller.signal, emptyContext);

        await withEffectHandler(ctxWithSignal, LogEffect, class {
            log(_key: string, msg: string) { spy(msg); }
        }).run(async (ctx) => {
            controller.abort();
            ctx[LogEffect].log("bob", "won't be processed");
        });

        expect(spy).not.toHaveBeenCalled();
    });

    it("calls [Symbol.dispose] on the handler instance when run exits", async () => {
        const dispose = vi.fn();
        const ctxWithSignal = withSignal(new AbortController().signal, emptyContext);

        await withEffectHandler(ctxWithSignal, LogEffect, class {
            log() {}
            [Symbol.dispose]() { dispose(); }
        }).run(async () => {});

        expect(dispose).toHaveBeenCalledOnce();
    });
});
