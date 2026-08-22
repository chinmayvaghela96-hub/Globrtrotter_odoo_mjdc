import { describe, expect, it, vi } from "vitest"

// The wrapper calls requireUser(), which reaches for cookies() and only works
// inside a request. Stub it so the wrapper's own contract can be tested.
vi.mock("@/lib/guard", () => ({
  requireUser: async () => ({ id: "user_1", email: "u@test", role: "USER" }),
}))

const { z } = await import("zod")
const { action, guestAction } = await import("@/lib/action")
const { Rejected, rejectField, ok } = await import("@/lib/result")

const Input = z.object({ name: z.string().min(2, "Too short.") })

describe("the server-action wrapper", () => {
  it("wraps a handler's return value in a success result", async () => {
    const run = action(Input, async (input) => ({ echoed: input.name }))
    expect(await run({ name: "Ada" })).toEqual({
      ok: true,
      data: { echoed: "Ada" },
    })
  })

  it("turns invalid input into field errors without calling the handler", async () => {
    const handler = vi.fn()
    const run = action(Input, handler)

    const result = await run({ name: "x" })

    expect(handler).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      error: "Check the highlighted fields.",
      fields: { name: "Too short." },
    })
  })

  /**
   * Regression test.
   *
   * The wrapper's job is to wrap whatever the handler returns in `ok(...)`,
   * so a handler that *returned* `fail(...)` came back as
   * `{ ok: true, data: { ok: false } }` — the form read a rejection as a
   * success and told the user it had saved. Business-rule rejections throw
   * `Rejected` instead, and the wrapper converts them back to a value.
   */
  it("reports a business-rule rejection as a failure, not a nested success", async () => {
    const run = action(Input, async () => {
      rejectField("name", "That name is already taken.")
    })

    const result = await run({ name: "Ada" })

    expect(result.ok).toBe(false)
    expect(result).toEqual({
      ok: false,
      error: "Check the highlighted fields.",
      fields: { name: "That name is already taken." },
    })
  })

  it("carries a rejection thrown with a bare message", async () => {
    const run = action(Input, async () => {
      throw new Rejected("This trip is already public.")
    })

    expect(await run({ name: "Ada" })).toEqual({
      ok: false,
      error: "This trip is already public.",
      fields: undefined,
    })
  })

  it("never leaks an unexpected error message to the caller", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const run = action(Input, async () => {
      throw new Error("Invalid `prisma.trip.findFirst()` — column does not exist")
    })
    const result = await run({ name: "Ada" })

    expect(result).toEqual({
      ok: false,
      error: "Something went wrong. Nothing was saved.",
    })
    // The detail belongs in the server log, not in the response.
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  /**
   * `redirect()` and `notFound()` signal by throwing a tagged error. A
   * blanket catch would swallow them and navigation would silently stop
   * working, so the wrapper has to rethrow before its own handling.
   */
  it("rethrows framework navigation signals instead of swallowing them", async () => {
    for (const digest of ["NEXT_REDIRECT;push;/dashboard;307;", "NEXT_HTTP_ERROR_FALLBACK;404"]) {
      const signal = Object.assign(new Error("signal"), { digest })
      const run = action(Input, async () => {
        throw signal
      })

      await expect(run({ name: "Ada" })).rejects.toBe(signal)
    }
  })
})

describe("the guest wrapper", () => {
  it("returns the handler's own result untouched", async () => {
    const run = guestAction(Input, async (input) => ok({ echoed: input.name }))
    expect(await run({ name: "Ada" })).toEqual({
      ok: true,
      data: { echoed: "Ada" },
    })
  })

  it("converts a rejection into a failure result", async () => {
    // Expression body: `rejectField` returns `never`, which satisfies the
    // handler's declared ActionResult return type.
    const run = guestAction(Input, async () =>
      rejectField("name", "Already registered."),
    )

    expect(await run({ name: "Ada" })).toEqual({
      ok: false,
      error: "Check the highlighted fields.",
      fields: { name: "Already registered." },
    })
  })
})
