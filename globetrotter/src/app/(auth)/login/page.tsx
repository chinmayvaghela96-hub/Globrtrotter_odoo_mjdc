import Link from "next/link"
import { signIn } from "@/actions/auth"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata = { title: "Sign in · GlobeTrotter" }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to pick up your trips where you left them.
        </p>
      </div>

      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        pendingLabel="Signing in..."
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

      <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Try the demo account</span>
        <br />
        demo@globetrotter.app / demo1234
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  )
}
