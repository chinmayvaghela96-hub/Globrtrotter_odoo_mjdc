import Link from "next/link"
import { DeleteAccount } from "@/components/profile/delete-account"
import { ProfileForm } from "@/components/profile/profile-form"
import { buttonVariants } from "@/components/ui/button"
import { getSavedCities } from "@/lib/catalogue-queries"
import { prisma } from "@/lib/db"
import { requireUser } from "@/lib/guard"

export const metadata = { title: "Profile · GlobeTrotter" }

export default async function ProfilePage() {
  const user = await requireUser()

  const [saved, tripCount] = await Promise.all([
    getSavedCities(user.id),
    prisma.trip.count({ where: { userId: user.id } }),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your details, preferences and saved destinations.
        </p>
      </div>

      <ProfileForm
        defaults={{
          name: user.name,
          email: user.email,
          photoUrl: user.photoUrl ?? "",
          language: user.language,
          currency: user.currency,
        }}
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Saved destinations
          </h2>
          <Link href="/cities" className="text-sm text-muted-foreground hover:underline">
            Browse cities
          </Link>
        </div>

        {saved.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
            <p className="max-w-prose text-sm text-muted-foreground">
              Nothing saved yet. Save a city while browsing and it will wait
              here until you are ready to plan around it.
            </p>
            <Link href="/cities" className={buttonVariants({ size: "sm" })}>
              Find somewhere to go
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((city) => (
              <li key={city.id}>
                <Link
                  href={`/activities?cityId=${city.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/25"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={city.imageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium leading-tight">
                      {city.name}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {city.country} · cost {city.costIndex}/100
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeleteAccount email={user.email} tripCount={tripCount} />
    </div>
  )
}
