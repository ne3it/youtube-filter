import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className
      )}
      {...props}
    />
  );
}