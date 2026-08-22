"use client"

import { useState, useTransition } from "react"
import { Check, Copy, ExternalLink, Globe, Lock, Share2 } from "lucide-react"
import { toast } from "sonner"
import { toggleShare } from "@/actions/share"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { SocialShareButtons } from "@/components/share/social-share-buttons"

export function ShareDialog({
  tripId,
  isPublic,
  shareSlug,
  tripName,
  tripDescription,
}: {
  tripId: string
  isPublic: boolean
  shareSlug: string | null
  tripName?: string
  tripDescription?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const shareUrl = shareSlug ? `${origin}/t/${shareSlug}` : ""

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleShare({ tripId })
      if (res.ok) {
        toast.success(
          res.data.isPublic
            ? "Trip is now public and shareable"
            : "Trip is now private",
        )
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={isPublic ? "outline" : "secondary"} className="gap-1.5">
            {isPublic ? (
              <>
                <Globe className="h-4 w-4 text-emerald-500" />
                <span>Public</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </>
            )}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Itinerary
          </DialogTitle>
          <DialogDescription>
            Allow others to view and clone this trip. Public trips are always read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Globe className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {isPublic ? "Public Sharing Enabled" : "Private Trip"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isPublic
                    ? "Anyone with the link can view & clone this trip."
                    : "Only you can see this trip."}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant={isPublic ? "destructive" : "default"}
              onClick={handleToggle}
              disabled={isPending}
            >
              {isPending
                ? "Updating..."
                : isPublic
                ? "Revoke Link"
                : "Make Public"}
            </Button>
          </div>

          {isPublic && shareUrl && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="share-link">Shareable Link</Label>
                <Input
                  id="share-link"
                  readOnly
                  value={shareUrl}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Social & Quick Sharing
                </span>
                <SocialShareButtons
                  shareUrl={shareUrl}
                  tripName={tripName ?? "My Itinerary"}
                  tripDescription={tripDescription}
                  showPrint={false}
                />
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <a
                  href={`/t/${shareSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open public preview <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
