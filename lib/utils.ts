import { type ClassValue, clsx as clsxFn } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsxFn(inputs));
}