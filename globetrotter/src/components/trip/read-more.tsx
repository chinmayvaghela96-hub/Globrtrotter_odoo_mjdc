"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * Collapses long trip descriptions to a single line with a "Read more" toggle.
 * Fully keyboard accessible (button focus ring) and respects any text size
 * the parent sets via className.
 */
export function ReadMore({
  text,
  maxLength = 140,
  className = "max-w-prose text-sm text-muted-foreground",
}: {
  text: string
  maxLength?: number
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>
  }

  return (
    <p className={className}>
      {expanded ? text : `${text.slice(0, maxLength).trimEnd()}…`}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="ml-1 h-auto px-0 py-0 text-xs font-medium"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? "Show less" : "Read more"}
      </Button>
    </p>
  )
}
