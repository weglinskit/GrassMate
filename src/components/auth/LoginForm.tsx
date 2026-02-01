import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/db/supabase.browser";
import { mapAuthErrorToMessage } from "@/lib/auth.errors";
import { loginSchema, type LoginSchema } from "@/lib/schemas/auth.schema";

interface LoginFormProps {
  returnUrl?: string;
  onSuccess?: (data: LoginSchema) => void;
  onError?: (fieldErrors: Record<string, string>) => void;
}

export function LoginForm({ returnUrl, onSuccess, onError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      const result = loginSchema.safeParse({ email, password });

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
        if (onError) onError(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        const { error } = await supabaseBrowser.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        });

        if (error) {
          toast.error(mapAuthErrorToMessage(error));
          if (onError) onError({ _form: mapAuthErrorToMessage(error) });
          return;
        }

        if (onSuccess) onSuccess(result.data);
        const target = returnUrl && returnUrl.startsWith("/") ? returnUrl : "/";
        window.location.href = target;
      } catch (err) {
        toast.error(
          mapAuthErrorToMessage(err instanceof Error ? err : { message: "" }),
        );
        if (onError) onError({ _form: "Wystąpił błąd. Spróbuj ponownie." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, returnUrl, onSuccess, onError],
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
        <Label htmlFor="login-email">Adres e-mail</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="np. jan@example.com"
          aria-invalid={hasError("email")}
          aria-describedby={hasError("email") ? "login-email-error" : undefined}
        />
        {fieldErrors.email && (
          <p
            id="login-email-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Hasło</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={hasError("password")}
          aria-describedby={
            hasError("password") ? "login-password-error" : undefined
          }
        />
        {fieldErrors.password && (
          <p
            id="login-password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logowanie…" : "Zaloguj się"}
        </Button>
        <a
          href={`/zapomniane-haslo${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Zapomniałeś hasła?
        </a>
      </div>
    </form>
  );
}
