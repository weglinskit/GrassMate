import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from "@/lib/schemas/auth.schema";

interface ForgotPasswordFormProps {
  returnUrl?: string;
  onSuccess?: (data: ForgotPasswordSchema) => void;
  onError?: (fieldErrors: Record<string, string>) => void;
}

export function ForgotPasswordForm({
  returnUrl,
  onSuccess,
  onError,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});

      const result = forgotPasswordSchema.safeParse({ email });

      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.flatten().fieldErrors &&
          Object.entries(result.error.flatten().fieldErrors).forEach(
            ([field, messages]) => {
              const msg = Array.isArray(messages) ? messages[0] : messages;
              if (msg) errors[field] = msg;
            }
          );
        setFieldErrors(errors);
        onError?.(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        onSuccess?.(result.data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, onSuccess, onError]
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
        <Label htmlFor="forgot-email">Adres e-mail</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="np. jan@example.com"
          aria-invalid={hasError("email")}
          aria-describedby={
            hasError("email") ? "forgot-email-error" : undefined
          }
        />
        {fieldErrors.email && (
          <p
            id="forgot-email-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wysyłanie…" : "Wyślij link do resetu"}
      </Button>
    </form>
  );
}
