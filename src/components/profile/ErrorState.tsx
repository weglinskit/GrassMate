import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  onRetry: () => void;
  message?: string;
  className?: string;
}

/**
 * Stan błędu widoku profilu — wyświetlany przy błędzie pobierania profilu (np. 500, błąd sieci).
 * Wyświetla komunikat i przycisk „Ponów” wywołujący refetch zapytania.
 */
export function ErrorState({
  onRetry,
  message = "Wystąpił błąd podczas ładowania profilu.",
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Błąd ładowania</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={onRetry}>
          Ponów
        </Button>
      </CardContent>
    </Card>
  );
}
