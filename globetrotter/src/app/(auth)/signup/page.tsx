import Link from "next/link"
import { signUp } from "@/actions/auth"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata = { title: "Create an account · GlobeTrotter" }

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Start planning in about thirty seconds.
        </p>
      </div>

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating..."
        fields={[
          { name: "name", label: "Name", autoComplete: "name", placeholder: "Ada Lovelace" },
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
            placeholder: "At least 8 characters",
          },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
