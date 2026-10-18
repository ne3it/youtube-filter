import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-paper hover:bg-ink/90 active:scale-[0.98]",
        accent:
          "bg-accent text-ink hover:bg-accent-hover active:scale-[0.98] shadow-sm",
        ghost:
          "bg-transparent text-ink hover:bg-paper/60",
        outline:
          "border border-line text-ink hover:bg-paper/60",
        danger:
          "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}