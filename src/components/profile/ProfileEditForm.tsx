import { useState, useCallback, useEffect } from "react";
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
import { updateLawnProfileSchema } from "@/lib/schemas/lawn-profiles.schema";
import type { LawnProfile } from "@/types";
import type { ApiErrorResponse, ValidationErrorDetail } from "@/types";

const NASŁONECZNIENIE_OPTIONS = [
  { value: "niskie", label: "Niskie" },
  { value: "średnie", label: "Średnie" },
  { value: "wysokie", label: "Wysokie" },
] as const;

interface ProfileEditFormProps {
  profile: LawnProfile;
  onSuccess?: (profile: LawnProfile) => void;
  onError?: (details: ValidationErrorDetail[]) => void;
  patchAvailable?: boolean;
}

/**
 * Formularz edycji profilu trawnika.
 * Pola: nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude.
 * Przycisk „Zapisz” wyłączony gdy patchAvailable === false.
 */
export function ProfileEditForm({
  profile,
  onSuccess,
  onError,
  patchAvailable = true,
}: ProfileEditFormProps) {
  const [nazwa, setNazwa] = useState(profile.nazwa);
  const [latitude, setLatitude] = useState(String(profile.latitude));
  const [longitude, setLongitude] = useState(String(profile.longitude));
  const [wielkośćM2, setWielkośćM2] = useState(String(profile.wielkość_m2));
  const [nasłonecznienie, setNasłonecznienie] = useState<
    "niskie" | "średnie" | "wysokie"
  >(profile.nasłonecznienie);
  const [rodzajPowierzchni, setRodzajPowierzchni] = useState(
    profile.rodzaj_powierzchni ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNazwa(profile.nazwa);
    setLatitude(String(profile.latitude));
    setLongitude(String(profile.longitude));
    setWielkośćM2(String(profile.wielkość_m2));
    setNasłonecznienie(profile.nasłonecznienie);
    setRodzajPowierzchni(profile.rodzaj_powierzchni ?? "");
  }, [profile]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});

      if (!patchAvailable) return;

      const parseNumber = (val: string): number | null => {
        if (val.trim() === "") return null;
        const n = parseFloat(val);
        return Number.isNaN(n) ? null : n;
      };

      const lat = parseNumber(latitude);
      const lon = parseNumber(longitude);
      const wielkość = parseNumber(wielkośćM2);

      const payload: Record<string, unknown> = {
        nazwa: nazwa.trim() || undefined,
        latitude: lat ?? undefined,
        longitude: lon ?? undefined,
        wielkość_m2: wielkość ?? undefined,
        nasłonecznienie,
        rodzaj_powierzchni:
          rodzajPowierzchni.trim() === ""
            ? undefined
            : rodzajPowierzchni.trim(),
      };

      const payloadWithoutUndefined = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined),
      );

      const result = updateLawnProfileSchema.safeParse(payloadWithoutUndefined);

      if (!result.success) {
        const errors: Record<string, string> = {};
        const fieldErrorsObj = result.error.flatten().fieldErrors;
        Object.entries(fieldErrorsObj).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : messages;
          if (msg) errors[field] = msg;
        });
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
        const res = await fetch(`/api/lawn-profiles/${profile.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(result.data),
        });

        const json = (await res
          .json()
          .catch(() => ({}))) as ApiErrorResponse & {
          data?: LawnProfile;
        };

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
                "Wystąpił błąd podczas zapisywania profilu",
            });
            onError?.([
              { field: "_form", message: json.error ?? json.message },
            ]);
          }
          return;
        }

        if (res.status === 200 && json.data) {
          onSuccess?.(json.data as LawnProfile);
        }
      } catch (err) {
        // eslint-disable-next-line no-console -- log submit errors in dev
        console.error("ProfileEditForm submit error:", err);
        setFieldErrors({
          _form: "Błąd sieci. Sprawdź połączenie i spróbuj ponownie.",
        });
        onError?.([{ field: "_form", message: "Błąd sieci" }]);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      patchAvailable,
      profile.id,
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
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
          readOnly={!patchAvailable}
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
            readOnly={!patchAvailable}
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
            readOnly={!patchAvailable}
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
          readOnly={!patchAvailable}
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
          disabled={!patchAvailable}
        >
          <SelectTrigger
            id="nasłonecznienie"
            className="w-full max-w-[200px]"
            aria-invalid={hasError("nasłonecznienie")}
            aria-describedby={
              hasError("nasłonecznienie") ? "nasłonecznienie-error" : undefined
            }
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
          readOnly={!patchAvailable}
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
        disabled={!patchAvailable || isSubmitting}
        title={!patchAvailable ? "Edycja będzie dostępna wkrótce" : undefined}
        aria-disabled={!patchAvailable}
      >
        {isSubmitting ? "Zapisywanie…" : "Zapisz"}
      </Button>
    </form>
  );
}
