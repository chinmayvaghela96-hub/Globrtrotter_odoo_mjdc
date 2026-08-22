import Link from "next/link"
import { signUp } from "@/actions/auth"
import { AuthForm } from "@/components/auth/auth-form"
import { safeRedirect } from "@/lib/safe-redirect"

export const metadata = { title: "Create an account" }

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  // Same filtering as the sign-in page: the action re-checks, this keeps a
  // hostile URL out of the page source.
  const next = safeRedirect(first(sp.next), "") || undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start planning in about thirty seconds.
        </p>
      </div>

      <AuthForm
        action={signUp}
        next={next}
        submitLabel="Create account"
        pendingLabel="Creating..."
        fields={[
          {
            name: "name",
            label: "Name",
            autoComplete: "name",
            placeholder: "Ada Lovelace",
          },
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
            autoComplete: "new-password",
            hint: "At least 8 characters.",
          },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
