import Link from "next/link"
import { signIn } from "@/actions/auth"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata = { title: "Sign in · GlobeTrotter" }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="text-xs text-[#93a8b0]">
          Sign in to pick up your journeys right where you left them.
        </p>
      </div>

      {/* Form */}
      <AuthForm
        action={signIn}
        submitLabel="Sign in to your account"
        pendingLabel="Signing in..."
        fields={[
          {
            name: "email",
            label: "Email address",
            type: "email",
            autoComplete: "email",
            placeholder: "you@example.com",
            defaultValue: "demo@globetrotter.app",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
            placeholder: "••••••••",
            defaultValue: "demo1234",
          },
        ]}
      />

      {/* Demo Account Box */}
      <div className="flex flex-col gap-1 rounded-xl border border-[#dcae72]/30 bg-[#dcae72]/10 p-3.5 text-xs text-[#e6edef]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#dcae72]">Demo Credentials</span>
          <span className="rounded-full bg-[#dcae72]/20 px-2 py-0.5 text-[10px] font-medium text-[#dcae72]">
            Ready to test
          </span>
        </div>
        <p className="text-[#c8d6da]">
          Email: <span className="font-mono text-white">demo@globetrotter.app</span>
          <br />
          Password: <span className="font-mono text-white">demo1234</span>
        </p>
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#93a8b0]">
        <Link href="/forgot-password" className="transition-colors hover:text-white hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium text-[#dcae72] transition-colors hover:text-[#e6bd8a] hover:underline">
          Create an account →
        </Link>
      </div>
    </div>
  )
}
