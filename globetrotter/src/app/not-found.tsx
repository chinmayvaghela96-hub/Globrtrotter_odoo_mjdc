import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

/**
 * Rung 4. Deliberately the same screen for "this does not exist" and "this
 * is not yours" — telling them apart would confirm that another user's trip
 * id is real, which is exactly the disclosure `lib/guard.ts` avoids.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-4 py-20">
      <h1 className="text-xl font-semibold tracking-tight">Nothing here</h1>
      <p className="text-sm text-muted-foreground">
        This page does not exist, or it belongs to someone else.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </div>
  )
}
