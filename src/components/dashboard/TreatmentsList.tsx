import { useCallback } from "react";
import { TreatmentCard } from "./TreatmentCard";
import type { Treatment, TreatmentWithEmbedded } from "@/types";

interface TreatmentsListProps {
  treatments: Treatment[] | TreatmentWithEmbedded[];
  onMarkComplete?: (treatment: Treatment) => void;
}

export function TreatmentsList({
  treatments,
  onMarkComplete,
}: TreatmentsListProps) {
  const handleMarkComplete = useCallback(
    (treatment: Treatment) => {
      onMarkComplete?.(treatment);
    },
    [onMarkComplete]
  );

  if (treatments.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-12 text-center"
        role="status"
      >
        <p className="text-muted-foreground">
          Brak nadchodzących zabiegów
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sprawdź swój harmonogram w innym terminie lub dodaj nowe zabiegi.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="grid gap-4 sm:grid-cols-1 md:grid-cols-2"
      role="list"
      aria-label="Lista nadchodzących zabiegów"
    >
      {treatments.map((treatment) => (
        <li key={treatment.id}>
          <TreatmentCard
            treatment={treatment}
            onMarkComplete={handleMarkComplete}
          />
        </li>
      ))}
    </ul>
  );
}
