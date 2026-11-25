import * as React from "react"
import { cn } from "@/lib/utils"

// --- Button ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "gold" | "outline" | "secondary" | "ghost" | "destructive" | "emerald"
  size?: "default" | "sm" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-sm",
      gold: "bg-gradient-to-r from-amber-700 to-amber-600 text-white hover:from-amber-800 hover:to-amber-700 shadow-sm",
      emerald: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm",
      outline: "border border-stone-200 bg-white text-stone-800 hover:bg-stone-100",
      secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200",
      ghost: "text-stone-700 hover:bg-stone-100",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    }
    const sizes: Record<string, string> = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9",
    }
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// --- Card ---
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200/80 bg-white text-stone-900 shadow-xs transition-all",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight text-stone-900", className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-stone-500", className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

// --- Badge ---
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "amber" | "emerald" | "rose" | "stone" | "purple"
}) {
  const styles: Record<string, string> = {
    default: "bg-stone-900 text-stone-50",
    amber: "bg-amber-50 text-amber-800 border border-amber-200/80",
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
    rose: "bg-rose-50 text-rose-800 border border-rose-200/80",
    stone: "bg-stone-100 text-stone-700 border border-stone-200",
    purple: "bg-purple-50 text-purple-800 border border-purple-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        styles[variant],
        className
      )}
      {...props}
    />
  )
}

// --- Input & Select ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Select.displayName = "Select"

// --- Progress ---
export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  const clamped = Math.min(100, Math.max(0, value || 0))
  return (
    <div className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-stone-100", className)}>
      <div
        className={cn("h-full transition-all duration-500 ease-out rounded-full bg-amber-600", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
