import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizes = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
}

const textSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
}

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600",
        sizes[size],
        className
      )}
    >
      <span className={cn("font-bold text-white", textSizes[size])}>M</span>
    </div>
  )
}
