import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { prisma } from "@/lib/db"
import { currentUser } from "@/lib/guard"

/**
 * The front door.
 *
 * Layout, copy and identity are carried over from the landing page in
 * `frontend/` — the petrol hero, the Playfair headline with a gold accent,
 * the flight path, and the Discover / Plan / Experience bar. Rebuilt here on
 * the app's own tokens so the landing and the product are one codebase.
 *
 * `currentUser()` rather than `requireUser()`: this page is public, and a
 * signed-in visitor should get a way straight back into their trips.
 */
export default async function LandingPage() {
  const [user, cityCount, activityCount] = await Promise.all([
    currentUser(),
    prisma.city.count(),
    prisma.activity.count(),
  ])

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#0b1e27] text-[#e6edef]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#0b1e27]/95 via-[#102b39]/85 to-[#0b5264]/70"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-6">
        <span className="font-heading text-xl font-semibold tracking-tight">
          GlobeTrotter
        </span>

        <nav className="ml-auto flex items-center gap-2">
          {user ? (
            <Link
              href="/dashboard"
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              Go to my trips
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm text-[#c8d6da] transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#dcae72] px-4 py-2 text-sm font-medium text-[#102b39] transition-colors hover:bg-[#e6bd8a]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="flex max-w-2xl flex-col gap-6">
          <h1 className="font-heading text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Build your own{" "}
            <em className="not-italic text-[#dcae72]">adventure</em>
          </h1>

          <div className="flex flex-col gap-1">
            <p className="text-lg text-[#c8d6da]">Plan. Personalize. Explore.</p>
            <p className="text-[#93a8b0]">Your dream trip, your way.</p>
          </div>

          {/* The flight path from the original landing page. */}
          <svg
            viewBox="0 0 420 60"
            className="h-12 w-full max-w-md text-[#dcae72]"
            aria-hidden
          >
            <path
              d="M6 50 C 110 6, 250 6, 392 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="5 7"
              strokeLinecap="round"
              opacity="0.65"
            />
            <g transform="translate(392 20) rotate(12)">
              <path d="M0 0 L-16 -6 L-11 0 L-16 6 Z" fill="currentColor" />
            </g>
          </svg>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={user ? "/trips/new" : "/signup"}
              className="rounded-lg bg-[#dcae72] px-5 py-2.5 font-medium text-[#102b39] transition-colors hover:bg-[#e6bd8a]"
            >
              {user ? "Plan a new trip" : "Start planning"}
            </Link>
            <Link
              href="/cities"
              className="rounded-lg border border-white/25 px-5 py-2.5 text-[#e6edef] transition-colors hover:border-white/50"
            >
              Browse {cityCount} cities
            </Link>
          </div>
        </div>

        <dl className="grid max-w-3xl gap-px overflow-hidden rounded-xl border border-white/15 bg-white/10 sm:grid-cols-3">
          {[
            {
              term: "Discover",
              detail: `${cityCount} cities and ${activityCount} things to do`,
            },
            { term: "Plan", detail: "Day-by-day, city by city" },
            { term: "Experience", detail: "With the budget in view" },
          ].map((feature) => (
            <div
              key={feature.term}
              className="flex flex-col gap-1 bg-[#0f2833]/85 px-5 py-4"
            >
              <dt className="font-heading text-lg font-semibold">
                {feature.term}
              </dt>
              <dd className="text-sm text-[#93a8b0]">{feature.detail}</dd>
            </div>
          ))}
        </dl>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8 text-sm text-[#7d939b]">
        Built for the Odoo hackathon.{" "}
        {!user && (
          <>
            Try it with{" "}
            <span className="font-mono text-[#93a8b0]">
              demo@globetrotter.app / demo1234
            </span>
          </>
        )}
      </footer>
    </div>
  )
}
