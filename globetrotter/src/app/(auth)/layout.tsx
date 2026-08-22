import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#0b1e27] px-4 py-12 text-[#e6edef]">
      {/* Background hero photo with atmospheric overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-20"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#0b1e27]/95 via-[#102b39]/90 to-[#0b5264]/75"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        {/* Brand Header */}
        <Link href="/" className="group flex items-center gap-2 text-center transition-opacity hover:opacity-90">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)] text-lg font-bold text-[#102b39] shadow-md transition-transform group-hover:scale-105">
            ✈
          </span>
          <span className="font-heading text-2xl font-bold tracking-tight text-white">
            GlobeTrotter
          </span>
        </Link>

        {/* Main Auth Card */}
        <div className="w-full rounded-2xl border border-white/15 bg-[#102b39]/85 p-7 shadow-2xl backdrop-blur-xl sm:p-8">
          {children}
        </div>

        <p className="text-center text-xs text-[#7d939b]">
          Plan. Personalize. Explore. Your dream trip, your way.
        </p>
      </div>
    </div>
  )
}
