import Link from "next/link"
import { SaveCityButton } from "@/components/catalogue/save-city-button"
import { buttonVariants } from "@/components/ui/button"
import { getSavedCities } from "@/lib/catalogue-queries"
import { requireUser } from "@/lib/guard"

export const metadata = { title: "Wishlist" }

/**
 * Saved cities, newest first.
 *
 * `SavedCity` has the composite primary key `[userId, cityId]`, so a row is
 * addressed by the pair — a user can only ever reach their own, and the same
 * city cannot be saved twice.
 */
export default async function WishlistPage() {
  const user = await requireUser()
  const cities = await getSavedCities(user.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Wishlist
          </h1>
          <p className="text-sm text-muted-foreground">
            {cities.length === 0
              ? "Cities you save are kept here."
              : `${cities.length} ${cities.length === 1 ? "city" : "cities"} saved for later.`}
          </p>
        </div>
        <Link href="/cities" className={buttonVariants({ variant: "outline" })}>
          Browse cities
        </Link>
      </div>

      {cities.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
          <h2 className="font-medium">Nothing saved yet</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Save a city while browsing and it waits here until you are ready to
            plan around it. Saving does not add it to a trip — you choose the
            dates later, in the itinerary builder.
          </p>
          <Link href="/cities" className={buttonVariants({ size: "sm" })}>
            Find somewhere to go
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <li
              key={city.id}
              className="flex h-full flex-col overflow-hidden rounded-xl border bg-card"
            >
              <Link href={`/cities/${city.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={city.imageUrl}
                  alt=""
                  className="h-32 w-full object-cover"
                  loading="lazy"
                />
              </Link>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <h2 className="font-medium leading-tight">
                      <Link
                        href={`/cities/${city.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {city.name}
                      </Link>
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {city.country}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {city.region}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Cost index{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {city.costIndex}/100
                  </span>
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {/* Starts saved by definition; the toggle removes it. */}
                  <SaveCityButton
                    cityId={city.id}
                    cityName={city.name}
                    initialSaved
                  />
                  <Link
                    href={`/activities?cityId=${city.id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Things to do
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
