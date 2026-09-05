import * as React from 'react'
import { cva } from 'class-variance-authority'

import type { VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '#/lib/utils.ts'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        // Fills with --surface, not --background. On the canvas — hero CTAs,
        // the site header, anything on a page ground — `bg-background` made
        // this button literally the page colour, so the only thing separating
        // a primary-adjacent action from the paint behind it was a 1.45:1
        // hairline. --surface lifts it 5.8 L* off the canvas, the same lift a
        // card gets, and --line-strong bounds it at 2.10:1 for the case where
        // it does sit on a card and the fill matches. Both themes take the
        // same treatment now; dark no longer needs its own fill overrides.
        outline:
          'border border-line-strong bg-surface shadow-xs hover:bg-surface-2 hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        // Filled brass. For an action that has to be findable on a page of
        // surfaces rather than one that outranks everything near it, without
        // reaching for the near-black --primary. The token flips between a
        // dark brass on light and a bright one on dark, so the foreground
        // flips with it.
        // Hover dims rather than switching to --brand-2. That token is lighter
        // than --brand in both themes, which on the light palette drags the
        // label down to 2.7:1 against the fill — a hover state that makes the
        // button harder to read than not hovering it. Opacity keeps the ratio.
        brand: 'bg-brand-fill text-brand-fill-ink shadow-xs hover:opacity-90',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
