import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { getAccessToken } from "@/lib/auth.browser";
import type { Treatment } from "@/types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CompleteTreatmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment: Treatment | null;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function CompleteTreatmentDrawer({
  open,
  onOpenChange,
  treatment,
  onSuccess,
  onError,
}: CompleteTreatmentDrawerProps) {
  const [dateValue, setDateValue] = useState(todayISO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDateValue(todayISO());
      setDateError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setDateError(null);

      if (!treatment) {
        onError?.("Nie wybrano zabiegu");
        return;
      }

      const date = dateValue.trim();
      if (!DATE_REGEX.test(date)) {
        setDateError("Data musi być w formacie YYYY-MM-DD");
        return;
      }

      const parsed = new Date(date + "T12:00:00");
      if (Number.isNaN(parsed.getTime())) {
        setDateError("Nieprawidłowa data");
        return;
      }

      setIsSubmitting(true);

      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/treatments/${treatment.id}/complete`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            data_wykonania_rzeczywista: date,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            json.error ?? json.message ?? "Nie udało się oznaczyć zabiegu";
          setDateError(message);
          onError?.(message);
          return;
        }

        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        console.error("CompleteTreatmentDrawer submit error:", err);
        const message = "Błąd sieci. Sprawdź połączenie i spróbuj ponownie.";
        setDateError(message);
        onError?.(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [treatment, dateValue, onOpenChange, onSuccess, onError],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isSubmitting) {
        onOpenChange(nextOpen);
      }
    },
    [isSubmitting, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Oznacz zabieg jako wykonany</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
          <div className="space-y-2">
            <Label htmlFor="data_wykonania_rzeczywista">Data wykonania</Label>
            <Input
              id="data_wykonania_rzeczywista"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              aria-invalid={Boolean(dateError)}
              aria-describedby={dateError ? "data_wykonania-error" : undefined}
            />
            {dateError && (
              <p
                id="data_wykonania-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {dateError}
              </p>
            )}
          </div>
          <SheetFooter className="mt-auto">
            <Button type="submit" disabled={isSubmitting || !treatment}>
              {isSubmitting ? "Zapisywanie…" : "Oznacz jako wykonane"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
