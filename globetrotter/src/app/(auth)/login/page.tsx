import Link from "next/link"
import { signIn } from "@/actions/auth"
import { AuthForm } from "@/components/auth/auth-form"
import { safeRedirect } from "@/lib/safe-redirect"

export const metadata = { title: "Sign in" }

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  // The middleware sets `next` when it turns an anonymous visitor away. The
  // action validates it again before redirecting — that is the check that
  // matters — but filtering here too keeps a hostile URL from ever being
  // echoed into the page source. An empty fallback means "no safe target".
  const next = safeRedirect(first(sp.next), "") || undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          {next
            ? "Sign in to open that page."
            : "Sign in to pick up your trips where you left them."}
        </p>
      </div>

      <AuthForm
        action={signIn}
        next={next}
        submitLabel="Sign in"
        pendingLabel="Signing in..."
        demo={{ email: "demo@globetrotter.app", password: "demo1234" }}
        fields={[
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
            placeholder: "you@example.com",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      />

      <div className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Demo account</span>
        <br />
        demo@globetrotter.app · demo1234
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  )
}
