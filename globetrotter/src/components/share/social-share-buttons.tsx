"use client"

import { useState } from "react"
import { Check, Copy, Printer, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function SocialShareButtons({
  shareUrl,
  tripName,
  tripDescription,
  showPrint = true,
  className = "",
}: {
  shareUrl: string
  tripName: string
  tripDescription?: string | null
  showPrint?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Public link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${tripName} · GlobeTrotter Itinerary`,
          text: tripDescription ?? `Check out the complete itinerary for ${tripName} on GlobeTrotter!`,
          url: shareUrl,
        })
      } catch (err) {
        // Ignore AbortError when user dismisses the native dialog
        if ((err as Error).name !== "AbortError") {
          handleCopy()
        }
      }
    } else {
      handleCopy()
    }
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(
    `Check out this travel itinerary: ${tripName} on GlobeTrotter ✈️`,
  )

  const twitterUrl = `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${tripName} on GlobeTrotter: ${shareUrl}`,
  )}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Native Share or Copy */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleNativeShare}
        className="gap-1.5 shadow-sm text-xs font-medium"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Share</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleCopy}
        className="gap-1.5 shadow-sm text-xs font-medium"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Link</span>
          </>
        )}
      </Button>

      {/* Quick Social Links */}
      <div className="flex items-center gap-1">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-emerald-600 dark:hover:text-emerald-400"
          title="Share on WhatsApp"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.971.53 1.769.813 2.796.813 3.183 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.77-5.769-5.8zm3.393 8.163c-.144.405-.837.774-1.17.825-.333.05-.689.074-2.148-.504-1.859-.736-3.057-2.617-3.15-2.74-.093-.123-.746-.992-.746-1.893 0-.9.472-1.343.64-1.528.168-.184.368-.231.491-.231.123 0 .246.002.354.007.113.006.262-.043.411.314.154.37.524 1.278.57 1.37.046.092.077.2.015.323-.062.123-.093.2-.185.307-.092.108-.194.24-.277.323-.092.093-.188.193-.081.378.108.185.478.788 1.025 1.275.704.627 1.297.821 1.482.913.185.092.293.077.4-.046.108-.123.462-.538.585-.723.123-.185.247-.154.416-.092.17.062 1.078.508 1.263.6.185.093.308.139.354.216.046.077.046.446-.098.851z" />
          </svg>
        </a>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (Twitter)"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Share on X"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-blue-600 dark:hover:text-blue-400"
          title="Share on LinkedIn"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.44c-.95 0-1.72.77-1.72 1.72s.77 1.72 1.72 1.72 1.72-.77 1.72-1.72c0-.95-.77-1.72-1.72-1.72z" />
          </svg>
        </a>
      </div>

      {/* Print button */}
      {showPrint && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handlePrint}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground print:hidden"
          title="Print or Save as PDF"
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Print</span>
        </Button>
      )}
    </div>
  )
}
