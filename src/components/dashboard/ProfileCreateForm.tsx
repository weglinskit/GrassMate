import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccessToken } from "@/lib/auth.browser";
import { createLawnProfileSchema } from "@/lib/schemas/lawn-profiles.schema";
import type { LawnProfile } from "@/types";
import type { ValidationErrorDetail } from "@/types";

interface ProfileCreateFormProps {
  onSuccess?: (profile: LawnProfile) => void;
  onError?: (details: ValidationErrorDetail[]) => void;
}

const NASŁONECZNIENIE_OPTIONS = [
  { value: "niskie", label: "Niskie" },
  { value: "średnie", label: "Średnie" },
  { value: "wysokie", label: "Wysokie" },
] as const;

export function ProfileCreateForm({
  onSuccess,
  onError,
}: ProfileCreateFormProps) {
  const [nazwa, setNazwa] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [wielkośćM2, setWielkośćM2] = useState("100");
  const [nasłonecznienie, setNasłonecznienie] = useState<
    "niskie" | "średnie" | "wysokie"
  >("średnie");
  const [rodzajPowierzchni, setRodzajPowierzchni] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});

      const parseNumber = (val: string): number | null => {
        if (val.trim() === "") return null;
        const n = parseFloat(val);
        return Number.isNaN(n) ? null : n;
      };

      const lat = parseNumber(latitude);
      const lon = parseNumber(longitude);

      const payload = {
        nazwa: nazwa.trim(),
        latitude: lat ?? undefined,
        longitude: lon ?? undefined,
        wielkość_m2: parseNumber(wielkośćM2) ?? undefined,
        nasłonecznienie,
        rodzaj_powierzchni: rodzajPowierzchni.trim() || undefined,
      };

      const result = createLawnProfileSchema.safeParse(payload);

      if (!result.success) {
        const errors: Record<string, string> = {};
        const fieldErrors = result.error.flatten().fieldErrors;
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages[0] : messages;
            if (msg) errors[field] = msg;
          });
        }
        setFieldErrors(errors);
        onError?.(
          Object.entries(errors).map(([field, message]) => ({
            field,
            message,
          })),
        );
        return;
      }

      setIsSubmitting(true);

      try {
        const token = await getAccessToken();
        const res = await fetch("/api/lawn-profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(result.data),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 400 && Array.isArray(json.details)) {
            const errors: Record<string, string> = {};
            (json.details as ValidationErrorDetail[]).forEach(
              ({ field, message }) => {
                errors[field] = message;
              },
            );
            setFieldErrors(errors);
            onError?.(json.details);
          } else {
            setFieldErrors({
              _form:
                json.error ??
                json.message ??
                "Wystąpił błąd podczas tworzenia profilu",
            });
            onError?.([
              { field: "_form", message: json.error ?? json.message },
            ]);
          }
          return;
        }

        if (res.status === 201 && json.data) {
          onSuccess?.(json.data as LawnProfile);
        }
      } catch (err) {
        // eslint-disable-next-line no-console -- log submit errors in dev
        console.error("ProfileCreateForm submit error:", err);
        setFieldErrors({
          _form: "Błąd sieci. Sprawdź połączenie i spróbuj ponownie.",
        });
        onError?.([{ field: "_form", message: "Błąd sieci" }]);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      nazwa,
      latitude,
      longitude,
      wielkośćM2,
      nasłonecznienie,
      rodzajPowierzchni,
      onSuccess,
      onError,
    ],
  );

  const hasError = (field: string) => Boolean(fieldErrors[field]);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      data-testid="lawn-profile-create-form"
    >
      {fieldErrors._form && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {fieldErrors._form}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nazwa">Nazwa profilu</Label>
        <Input
          id="nazwa"
          type="text"
          value={nazwa}
          onChange={(e) => setNazwa(e.target.value)}
          placeholder="np. Trawnik przed domem"
          aria-invalid={hasError("nazwa")}
          aria-describedby={hasError("nazwa") ? "nazwa-error" : undefined}
          data-testid="lawn-profile-create-field-nazwa"
        />
        {fieldErrors.nazwa && (
          <p id="nazwa-error" className="text-sm text-destructive" role="alert">
            {fieldErrors.nazwa}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="latitude">Szerokość geograficzna</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="-90 do 90"
            aria-invalid={hasError("latitude")}
            aria-describedby={
              hasError("latitude") ? "latitude-error" : undefined
            }
            data-testid="lawn-profile-create-field-latitude"
          />
          {fieldErrors.latitude && (
            <p
              id="latitude-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {fieldErrors.latitude}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Długość geograficzna</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="-180 do 180"
            aria-invalid={hasError("longitude")}
            aria-describedby={
              hasError("longitude") ? "longitude-error" : undefined
            }
            data-testid="lawn-profile-create-field-longitude"
          />
          {fieldErrors.longitude && (
            <p
              id="longitude-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {fieldErrors.longitude}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wielkość_m2">Powierzchnia (m²)</Label>
        <Input
          id="wielkość_m2"
          type="number"
          min={1}
          step={1}
          value={wielkośćM2}
          onChange={(e) => setWielkośćM2(e.target.value)}
          aria-invalid={hasError("wielkość_m2")}
          aria-describedby={
            hasError("wielkość_m2") ? "wielkość_m2-error" : undefined
          }
          data-testid="lawn-profile-create-field-wielkosc-m2"
        />
        {fieldErrors.wielkość_m2 && (
          <p
            id="wielkość_m2-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.wielkość_m2}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nasłonecznienie">Nasłonecznienie</Label>
        <Select
          value={nasłonecznienie}
          onValueChange={(v) =>
            setNasłonecznienie(v as "niskie" | "średnie" | "wysokie")
          }
        >
          <SelectTrigger
            id="nasłonecznienie"
            className="w-full max-w-[200px]"
            aria-invalid={hasError("nasłonecznienie")}
            aria-describedby={
              hasError("nasłonecznienie") ? "nasłonecznienie-error" : undefined
            }
            data-testid="lawn-profile-create-field-naslonecznienie"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NASŁONECZNIENIE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.nasłonecznienie && (
          <p
            id="nasłonecznienie-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.nasłonecznienie}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rodzaj_powierzchni">
          Rodzaj powierzchni{" "}
          <span className="text-muted-foreground">(opcjonalnie)</span>
        </Label>
        <Input
          id="rodzaj_powierzchni"
          type="text"
          value={rodzajPowierzchni}
          onChange={(e) => setRodzajPowierzchni(e.target.value)}
          placeholder="np. mieszanka sportowa"
          aria-invalid={hasError("rodzaj_powierzchni")}
          aria-describedby={
            hasError("rodzaj_powierzchni")
              ? "rodzaj_powierzchni-error"
              : undefined
          }
          data-testid="lawn-profile-create-field-rodzaj-powierzchni"
        />
        {fieldErrors.rodzaj_powierzchni && (
          <p
            id="rodzaj_powierzchni-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.rodzaj_powierzchni}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        data-testid="lawn-profile-create-submit"
      >
        {isSubmitting ? "Tworzenie…" : "Utwórz profil"}
      </Button>
    </form>
  );
}
