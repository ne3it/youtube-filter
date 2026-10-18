import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({ className, padding = "md", ...props }: CardProps) {
  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-paper shadow-sm",
        paddings[padding],
        className
      )}
      {...props}
    />
  );
}