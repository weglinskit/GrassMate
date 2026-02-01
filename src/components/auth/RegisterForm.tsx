import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/db/supabase.browser";
import { mapAuthErrorToMessage } from "@/lib/auth.errors";
import { registerSchema, type RegisterSchema } from "@/lib/schemas/auth.schema";

interface RegisterFormProps {
  returnUrl?: string;
  onSuccess?: (data: RegisterSchema) => void;
  onError?: (fieldErrors: Record<string, string>) => void;
}

export function RegisterForm({
  returnUrl,
  onSuccess,
  onError,
}: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfLoggedIn() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      setIsCheckingSession(false);
      if (session) {
        const target = returnUrl && returnUrl.startsWith("/") ? returnUrl : "/";
        window.location.href = target;
      }
    }

    redirectIfLoggedIn();
    return () => {
      cancelled = true;
    };
  }, [returnUrl]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});

      const result = registerSchema.safeParse({
        email,
        password,
        passwordConfirm,
      });

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
        onError?.(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        const { data, error } = await supabaseBrowser.auth.signUp({
          email: result.data.email,
          password: result.data.password,
        });

        if (error) {
          const message = mapAuthErrorToMessage(error, "register");
          toast.error(message);
          onError?.({ _form: message });
          return;
        }

        onSuccess?.(result.data);

        if (data.session) {
          const target =
            returnUrl && returnUrl.startsWith("/") ? returnUrl : "/";
          window.location.href = target;
          return;
        }

        toast.success(
          "Sprawdź skrzynkę e-mail i potwierdź adres — wysłaliśmy link do potwierdzenia konta.",
        );
        const loginUrl = `/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`;
        window.location.href = loginUrl;
      } catch (err) {
        const message = mapAuthErrorToMessage(
          err instanceof Error ? err : { message: "" },
          "register",
        );
        toast.error(message);
        onError?.({ _form: "Wystąpił błąd. Spróbuj ponownie." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, passwordConfirm, returnUrl, onSuccess, onError],
  );

  const hasError = (field: string) => Boolean(fieldErrors[field]);

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Sprawdzanie sesji…
      </div>
    );
  }

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
        <Label htmlFor="register-email">Adres e-mail</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="np. jan@example.com"
          aria-invalid={hasError("email")}
          aria-describedby={
            hasError("email") ? "register-email-error" : undefined
          }
        />
        {fieldErrors.email && (
          <p
            id="register-email-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Hasło</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={hasError("password")}
          aria-describedby={
            hasError("password") ? "register-password-error" : undefined
          }
        />
        {fieldErrors.password && (
          <p
            id="register-password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-passwordConfirm">Potwierdzenie hasła</Label>
        <Input
          id="register-passwordConfirm"
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          aria-invalid={hasError("passwordConfirm")}
          aria-describedby={
            hasError("passwordConfirm")
              ? "register-passwordConfirm-error"
              : undefined
          }
        />
        {fieldErrors.passwordConfirm && (
          <p
            id="register-passwordConfirm-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.passwordConfirm}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Rejestracja…" : "Zarejestruj się"}
      </Button>
    </form>
  );
}
