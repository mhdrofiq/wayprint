import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "1 pin", "3 pins". */
export function countLabel(n: number, noun: string) {
  return `${n} ${n === 1 ? noun : `${noun}s`}`
}
