import type { Metadata } from "next"
import { DM_Sans, Geist_Mono, Playfair_Display } from "next/font/google"
import "./globals.css"

// DM Sans + Playfair Display are carried over from the landing page design
// in frontend/, so the app and its front door share one identity.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "GlobeTrotter",
    template: "%s · GlobeTrotter",
  },
  description:
    "Plan multi-city trips, watch the budget as you build, and share the itinerary.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // `dark` is applied unconditionally: the landing page is a petrol hero,
    // and an app that flipped to a white ground the moment you signed in read
    // as two different products. The full light palette is still defined in
    // globals.css, so a theme toggle only needs to remove this class.
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
