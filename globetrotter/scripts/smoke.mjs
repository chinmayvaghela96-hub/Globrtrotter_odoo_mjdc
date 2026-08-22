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
// By fixed id, not "the demo user's first trip" — otherwise a trip created by
// hand while clicking through the app can win the race and every content
// assertion below fails against the wrong itinerary.
const trip = await prisma.trip.findUniqueOrThrow({ where: { id: "seed_trip_sea_loop" } })

const token = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(demo.id)
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.SESSION_SECRET))

const cookie = `gt_session=${token}`

const checks = [
  { path: "/", expect: ["Build your own", "adventure", "Discover"] },
  { path: "/dashboard", expect: ["Southeast Asia Loop", "Popular destinations"] },
  { path: "/trips", expect: ["My trips", "Bangkok"] },
  { path: "/trips/new", expect: ["Plan a new trip", "Total budget"] },
  { path: `/trips/${trip.id}`, expect: ["Bangkok", "Chiang Mai", "Ubud"] },
  { path: `/trips/${trip.id}/build`, expect: ["Stops", "Add a stop"] },
  { path: `/trips/${trip.id}/budget`, expect: ["Total Planned Spend", "Category Distribution", "Daily Spending Timeline"] },
  // Fragments only: "&" renders as "&amp;", and "Day {n}" renders as
  // "Day <!-- -->1", so neither survives a literal substring check.
  { path: `/trips/${trip.id}/calendar`, expect: ["Timeline", "Daily Schedule", "Day spend"] },
  { path: "/t/sea-loop-demo", expect: ["Southeast Asia Loop", "Public Itinerary"] },
  { path: "/profile", expect: ["Saved destinations", "Delete account"] },
  { path: "/cities", expect: ["Paris", "Bangkok"] },
  { path: "/cities?region=Oceania", expect: ["Sydney", "Queenstown"] },
  { path: "/activities", expect: ["Guided tour"] },
  { path: "/activities?cityId=" + (await prisma.city.findFirstOrThrow({
      where: { name: "Bangkok" }, select: { id: true },
    })).id, expect: ["Grand Palace"] },
  { path: "/cities?country=Thailand", expect: ["Bangkok", "Chiang Mai"] },
  { path: "/cities?region=Europe&country=France", expect: ["Paris"] },
  { path: "/wishlist", expect: ["Wishlist"] },
  // Added upstream by the public-sharing work.
  { path: "/inspiration", expect: ["Inspiration"] },
  { path: "/cities/" + (await prisma.city.findFirstOrThrow({
      where: { name: "Bangkok" }, select: { id: true },
    })).id, expect: ["Bangkok", "Nearby cities", "Where it is"] },
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

// The map route must degrade rather than fail when no key is configured, and
// must never serve an anonymous request.
{
  const anon = await fetch(`${base}/api/map/static?w=320&h=160&m=100.5,13.75,p`, {
    redirect: "manual",
  })
  const anonOk = anon.status === 401 || anon.status === 307
  if (!anonOk) failures++
  console.log(
    `${anonOk ? "PASS" : "FAIL"}  ${anon.status} /api/map/static (anonymous, expect 401/307)`,
  )

  const withKey = process.env.MAP_API_KEY?.trim()
  const mapped = await fetch(`${base}/api/map/static?w=320&h=160&m=100.5,13.75,p`, {
    headers: { cookie },
    redirect: "manual",
  })
  // 502 means the vendor rejected us — an unenabled API, a restricted key, no
  // billing. That is an environment problem, not a code regression, and the
  // page still renders its fallback, so it warns rather than failing the run.
  if (withKey && mapped.status === 502) {
    console.log(
      `WARN  502 /api/map/static — key set but the provider rejected it; the SVG fallback is serving`,
    )
  } else {
    const expected = withKey ? 200 : 501
    const mapOk = mapped.status === expected
    if (!mapOk) failures++
    console.log(
      `${mapOk ? "PASS" : "FAIL"}  ${mapped.status} /api/map/static (key ${withKey ? "set" : "unset"}, expect ${expected})`,
    )
  }

  const bad = await fetch(`${base}/api/map/static?w=99999&m=999,999`, {
    headers: { cookie },
    redirect: "manual",
  })
  // 400 when a provider is configured; 501 short-circuits before validation.
  const badOk = bad.status === 400 || bad.status === 501
  if (!badOk) failures++
  console.log(
    `${badOk ? "PASS" : "FAIL"}  ${bad.status} /api/map/static (invalid params, expect 400/501)`,
  )
}

// Rates must always answer with a usable number, configured or not, and must
// never serve an anonymous request.
{
  const anon = await fetch(`${base}/api/rates?from=EUR&to=INR`, { redirect: "manual" })
  const anonOk = anon.status === 401 || anon.status === 307
  if (!anonOk) failures++
  console.log(
    `${anonOk ? "PASS" : "FAIL"}  ${anon.status} /api/rates (anonymous, expect 401/307)`,
  )

  const rate = await fetch(`${base}/api/rates?from=EUR&to=INR`, {
    headers: { cookie },
    redirect: "manual",
  })
  const body = rate.ok ? await rate.json() : {}
  const rateOk = rate.status === 200 && typeof body.rate === "number" && body.rate > 0
  if (!rateOk) failures++
  console.log(
    `${rateOk ? "PASS" : "FAIL"}  ${rate.status} /api/rates EUR->INR = ${body.rate} (${body.source})`,
  )

  const bogus = await fetch(`${base}/api/rates?from=XYZ&to=INR`, {
    headers: { cookie },
    redirect: "manual",
  })
  const bogusOk = bogus.status === 400
  if (!bogusOk) failures++
  console.log(
    `${bogusOk ? "PASS" : "FAIL"}  ${bogus.status} /api/rates (unknown currency, expect 400)`,
  )
}

// Satellite imagery: optional, so 501 when unconfigured is correct, and a
// vendor that cannot produce a clear scene warns rather than fails.
{
  const anon = await fetch(`${base}/api/satellite?lat=13.75&lon=100.5`, {
    redirect: "manual",
  })
  const anonOk = anon.status === 401 || anon.status === 307
  if (!anonOk) failures++
  console.log(
    `${anonOk ? "PASS" : "FAIL"}  ${anon.status} /api/satellite (anonymous, expect 401/307)`,
  )

  const configured = Boolean(
    process.env.COPERNICUS_CLIENT_ID?.trim() &&
      process.env.COPERNICUS_CLIENT_SECRET?.trim(),
  )
  const shot = await fetch(`${base}/api/satellite?lat=13.75&lon=100.5&size=256`, {
    headers: { cookie },
    redirect: "manual",
  })

  if (!configured) {
    const ok = shot.status === 501
    if (!ok) failures++
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${shot.status} /api/satellite (unconfigured, expect 501)`,
    )
  } else if (shot.status === 200) {
    console.log(`PASS  200 /api/satellite (live Sentinel-2 render)`)
  } else {
    // Credentials set but no scene: cloud cover is a real condition, and the
    // panel explains itself rather than breaking.
    console.log(
      `WARN  ${shot.status} /api/satellite — credentials set but no scene returned`,
    )
  }
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
