import { redirect } from "next/navigation"

// Middleware sends signed-out visitors to /login, so this is the only
// routing decision the root needs to make.
export default function RootPage() {
  redirect("/dashboard")
}
