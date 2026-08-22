import Link from "next/link"

/**
 * A split door: the landing page's petrol hero on the left, the form on the
 * right. On narrow screens the hero collapses to a slim banner so the form is
 * never pushed below the fold.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1e27] p-10 text-[#e6edef] lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#0b1e27]/95 via-[#102b39]/85 to-[#0b5264]/70"
        />

        <Link
          href="/"
          className="relative z-10 font-heading text-xl font-semibold tracking-tight"
        >
          GlobeTrotter
        </Link>

        <div className="relative z-10 flex flex-col gap-4">
          <p className="font-heading text-4xl leading-tight font-semibold text-balance">
            Build your own <em className="not-italic text-[#dcae72]">adventure</em>
          </p>
          <p className="max-w-sm text-[#93a8b0]">
            Multi-city itineraries, a running budget, and a plan you can share.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[#7d939b]">
          Built for the Odoo hackathon.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center gap-8 px-6 py-12">
        <Link
          href="/"
          className="font-heading text-xl font-semibold tracking-tight lg:hidden"
        >
          GlobeTrotter
        </Link>

        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
