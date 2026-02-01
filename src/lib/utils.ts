import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Zwraca przedział dat dla nadchodzących zabiegów w formacie YYYY-MM-DD (timezone lokalny przeglądarki).
 * from = dziś, to = dziś + days dni (włącznie).
 *
 * @param days – liczba dni okna (np. 10 → od dziś do dziś+10 włącznie)
 * @returns { from, to } – daty w ISO YYYY-MM-DD
 */
export function getUpcomingDateRange(days: number): {
  from: string;
  to: string;
} {
  const fromDate = new Date();
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
    to: `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`,
  };
}
