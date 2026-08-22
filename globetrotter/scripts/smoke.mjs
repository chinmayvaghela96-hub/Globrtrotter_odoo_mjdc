/**
 * Smoke test against a running dev server.
 *
 * Mints a real session cookie with the app's own secret, then fetches every
 * page a judge will click through and asserts the content actually rendered.
 * Catches the class of failure a unit test cannot: a page that typechecks but
 * throws at request time.
 *
 *   node scripts/smoke.mjs [baseUrl]
 */
import { SignJWT } from "jose"
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "node:fs"

// Load .env without adding a dependency.
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = /^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
}

const base = process.argv[2] ?? "http://localhost:3000"
const prisma = new PrismaClient()

const demo = await prisma.user.findUniqueOrThrow({
  where: { email: "demo@globetrotter.app" },
})
const trip = await prisma.trip.findFirstOrThrow({ where: { userId: demo.id } })

const token = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(demo.id)
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.SESSION_SECRET))

const cookie = `gt_session=${token}`

const checks = [
  { path: "/", expect: ["Build your own", "adventure", "Discover"] },
  { path: "/dashboard", expect: ["Southeast Asia Loop", "Popular right now"] },
  { path: "/trips", expect: ["My trips", "Bangkok"] },
  { path: "/trips/new", expect: ["Plan a new trip", "Total budget"] },
  { path: `/trips/${trip.id}`, expect: ["Bangkok", "Chiang Mai", "Ubud"] },
  { path: `/trips/${trip.id}/build`, expect: ["Stops", "Add a stop"] },
  { path: `/trips/${trip.id}/budget`, expect: ["Total Planned Spend", "Category Distribution", "Daily Spending Timeline"] },
  { path: `/trips/${trip.id}/calendar`, expect: ["Timeline & Daily Schedule", "Day 1"] },
  { path: "/t/sea-loop-demo", expect: ["Southeast Asia Loop", "Public Itinerary"] },
  { path: "/profile", expect: ["Saved destinations", "Delete account"] },
  { path: "/cities", expect: ["Paris", "Bangkok"] },
  { path: "/cities?region=Oceania", expect: ["Sydney", "Queenstown"] },
  { path: "/activities", expect: ["Guided tour"] },
  { path: "/activities?cityId=" + (await prisma.city.findFirstOrThrow({
      where: { name: "Bangkok" }, select: { id: true },
    })).id, expect: ["Grand Palace"] },
]

let failures = 0

for (const check of checks) {
  const response = await fetch(base + check.path, {
    headers: { cookie },
    redirect: "manual",
  })
  const body = response.ok ? await response.text() : ""
  const missing = check.expect.filter((needle) => !body.includes(needle))

  const ok = response.status === 200 && missing.length === 0
  if (!ok) failures++

  console.log(
    `${ok ? "PASS" : "FAIL"}  ${String(response.status).padEnd(3)} ${check.path}` +
      (missing.length ? `  missing: ${missing.join(", ")}` : ""),
  )
}

// Authorization, over HTTP: a real id belonging to nobody in this session.
const stranger = await prisma.user.findFirstOrThrow({
  where: { email: "admin@globetrotter.app" },
})
const strangerToken = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(stranger.id)
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.SESSION_SECRET))

const idor = await fetch(`${base}/trips/${trip.id}/build`, {
  headers: { cookie: `gt_session=${strangerToken}` },
  redirect: "manual",
})
const idorOk = idor.status === 404
if (!idorOk) failures++
console.log(
  `${idorOk ? "PASS" : "FAIL"}  ${idor.status} /trips/<other-users-id>/build  (expect 404)`,
)

await prisma.$disconnect()
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
