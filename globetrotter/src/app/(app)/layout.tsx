import Link from "next/link"
import { Toaster } from "@/components/ui/sonner"
import { requireUser } from "@/lib/guard"
import { signOut } from "@/actions/auth"
import { Button } from "@/components/ui/button"

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trips", label: "My trips" },
  { href: "/inspiration", label: "Inspiration" },
  { href: "/cities", label: "Cities" },
  { href: "/activities", label: "Activities" },
  { href: "/wishlist", label: "Wishlist" },
]

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware already redirected anonymous visitors, but this is the check
  // that actually matters: it resolves the user the page will render for.
  const user = await requireUser()

  return (
    <div className="flex min-h-svh flex-col">
      {/* The same petrol ground as the landing hero, so the app reads as the
          inside of the page people arrived on. */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-shell text-shell-foreground">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
          <Link
            href="/dashboard"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            GlobeTrotter
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-shell-muted transition-colors hover:bg-white/10 hover:text-shell-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-sm text-shell-muted hover:text-shell-foreground"
              >
                Admin
              </Link>
            )}
            <Link
              href="/profile"
              className="hidden text-sm text-shell-muted hover:text-shell-foreground sm:block"
            >
              {user.name}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-shell-muted hover:bg-white/10 hover:text-shell-foreground">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-shell-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <Toaster position="bottom-right" />
    </div>
  )
}
