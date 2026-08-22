/**
 * Pre-made trip templates.
 *
 * Lives here rather than beside the action that consumes it because a
 * "use server" module may only export async functions. Exporting this array
 * from one gave client components a server reference instead of the data, so
 * TEMPLATES.map crashed the template gallery at render time — a runtime
 * error, not a type error.
 */

export type Template = {
  id: string
  name: string
  description: string
  durationDays: number
  cities: { name: string; country: string; nights: number }[]
  emoji: string
}

export const TEMPLATES: Template[] = [
  {
    id: "sea-loop",
    name: "Southeast Asia Loop",
    description: "Bangkok → Chiang Mai → Ubud. Street food, temples and rice terraces.",
    durationDays: 21,
    emoji: "🌴",
    cities: [
      { name: "Bangkok", country: "Thailand", nights: 4 },
      { name: "Chiang Mai", country: "Thailand", nights: 4 },
      { name: "Ubud", country: "Indonesia", nights: 5 },
    ],
  },
  {
    id: "europe-highlights",
    name: "Europe Highlights",
    description: "Paris → Rome → Barcelona. The classics in three weeks.",
    durationDays: 21,
    emoji: "🗼",
    cities: [
      { name: "Paris", country: "France", nights: 5 },
      { name: "Rome", country: "Italy", nights: 5 },
      { name: "Barcelona", country: "Spain", nights: 5 },
    ],
  },
  {
    id: "japan-rail",
    name: "Japan Rail Pass",
    description: "Tokyo → Kyoto → Osaka. Bullet trains, shrines, and ramen.",
    durationDays: 14,
    emoji: "🗾",
    cities: [
      { name: "Tokyo", country: "Japan", nights: 5 },
      { name: "Kyoto", country: "Japan", nights: 4 },
      { name: "Osaka", country: "Japan", nights: 3 },
    ],
  },
  {
    id: "india-triangle",
    name: "Golden Triangle India",
    description: "Delhi → Agra → Jaipur. Mughal forts, the Taj and pink-city bazaars.",
    durationDays: 10,
    emoji: "🕌",
    cities: [
      { name: "Delhi", country: "India", nights: 3 },
      { name: "Agra", country: "India", nights: 2 },
      { name: "Jaipur", country: "India", nights: 3 },
    ],
  },
  {
    id: "australia-east",
    name: "Australia East Coast",
    description: "Sydney → Melbourne. Coffee culture, beaches, and the Great Ocean Road.",
    durationDays: 14,
    emoji: "🦘",
    cities: [
      { name: "Sydney", country: "Australia", nights: 5 },
      { name: "Melbourne", country: "Australia", nights: 5 },
    ],
  },
]
