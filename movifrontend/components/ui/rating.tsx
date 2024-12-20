import * as React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingProps {
  value: number
  max?: number
  onChange?: (value: number) => void
  readonly?: boolean
  className?: string
}

export function Rating({
  value,
  max = 10,
  onChange,
  readonly = false,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)

  return (
    <div className={cn("flex gap-1", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
        const filled = (hoverValue ?? value) >= rating

        return (
          <button
            key={rating}
            type="button"
            className={cn(
              "rounded-full p-0.5 transition-colors",
              filled ? "text-yellow-400" : "text-gray-300",
              !readonly && "hover:text-yellow-400",
              readonly && "cursor-default"
            )}
            onClick={() => !readonly && onChange?.(rating)}
            onMouseEnter={() => !readonly && setHoverValue(rating)}
            onMouseLeave={() => !readonly && setHoverValue(null)}
            disabled={readonly}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-transform",
                !readonly && "hover:scale-110",
                filled && "fill-current"
              )}
            />
          </button>
        )
      })}
      <span className="ml-2 text-sm text-gray-500">{value}/10</span>
    </div>
  )
} 