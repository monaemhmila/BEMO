import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-violet-deep hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600 focus-visible:ring-red-500/30",
        outline:
          "border border-border bg-background shadow-sm hover:bg-muted hover:border-foreground/20 text-foreground/90",
        secondary:
          "bg-secondary text-foreground shadow-sm hover:bg-blush",
        ghost:
          "hover:bg-muted hover:text-foreground text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: 
          "bg-gradient-to-r from-primary to-violet-deep text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 border-none",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 px-8 text-base has-[>svg]:px-6",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
