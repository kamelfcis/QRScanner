import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getName(locale: string | undefined, nameEn: string, nameAr: string | null | undefined): string {
  if (locale === 'ar' && nameAr) return nameAr;
  return nameEn;
}
