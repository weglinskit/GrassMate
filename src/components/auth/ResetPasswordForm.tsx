import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "@/lib/schemas/auth.schema";

interface ResetPasswordFormProps {
  onSuccess?: (data: ResetPasswordSchema) => void;
  onError?: (fieldErrors: Record<string, string>) => void;
}

export function ResetPasswordForm({
  onSuccess,
  onError,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});

      const result = resetPasswordSchema.safeParse({
        password,
        passwordConfirm,
      });

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
    [password, passwordConfirm, onSuccess, onError]
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
        <Label htmlFor="reset-password">Nowe hasło</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={hasError("password")}
          aria-describedby={
            hasError("password") ? "reset-password-error" : undefined
          }
        />
        {fieldErrors.password && (
          <p
            id="reset-password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-passwordConfirm">Potwierdzenie hasła</Label>
        <Input
          id="reset-passwordConfirm"
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          aria-invalid={hasError("passwordConfirm")}
          aria-describedby={
            hasError("passwordConfirm")
              ? "reset-passwordConfirm-error"
              : undefined
          }
        />
        {fieldErrors.passwordConfirm && (
          <p
            id="reset-passwordConfirm-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.passwordConfirm}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Zapisywanie…" : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
