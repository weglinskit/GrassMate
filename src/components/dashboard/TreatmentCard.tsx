import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Treatment, TreatmentWithEmbedded } from "@/types";

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate + "T12:00:00");
    return date.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function getTreatmentName(treatment: Treatment | TreatmentWithEmbedded): string {
  const withEmbedded = treatment as TreatmentWithEmbedded;
  return withEmbedded.template?.nazwa ?? "Zabieg";
}

interface TreatmentCardProps {
  treatment: Treatment | TreatmentWithEmbedded;
  onMarkComplete?: (treatment: Treatment) => void;
}

export function TreatmentCard({ treatment, onMarkComplete }: TreatmentCardProps) {
  const handleClick = useCallback(() => {
    onMarkComplete?.(treatment);
  }, [treatment, onMarkComplete]);

  const name = getTreatmentName(treatment);
  const formattedDate = formatDate(treatment.data_proponowana);
  const hasWeatherRationale = Boolean(treatment.uzasadnienie_pogodowe?.trim());

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Data proponowana:</span>{" "}
          {formattedDate}
        </p>
        {hasWeatherRationale && (
          <p className="text-sm text-muted-foreground">
            {treatment.uzasadnienie_pogodowe}
          </p>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          aria-label={`Oznacz zabieg „${name}" jako wykonany`}
        >
          Oznacz wykonanie
        </Button>
      </CardFooter>
    </Card>
  );
}
