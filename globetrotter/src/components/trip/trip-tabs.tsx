"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname()
  const base = `/trips/${tripId}`

  const tabs = [
    { href: base, label: "Itinerary" },
    { href: `${base}/build`, label: "Build" },
    { href: `${base}/budget`, label: "Budget" },
    { href: `${base}/calendar`, label: "Calendar" },
  ]

  return (
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Trip sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
