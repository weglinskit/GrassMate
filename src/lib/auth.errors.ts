/**
 * Mapowanie błędów Supabase Auth na przyjazne komunikaty UX (toast).
 * Zgodnie z auth-spec: nie ujawniać wewnętrznych komunikatów Supabase.
 */

export function mapAuthErrorToMessage(
  error: { message?: string } | null,
): string {
  if (!error?.message) {
    return "Wystąpił błąd. Spróbuj ponownie.";
  }

  const msg = error.message.toLowerCase();

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials")
  ) {
    return "Nieprawidłowy e-mail lub hasło.";
  }
  if (
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    return "Potwierdź adres e-mail — sprawdź skrzynkę.";
  }
  if (
    msg.includes("user already registered") ||
    msg.includes("already registered") ||
    msg.includes("signup_disabled")
  ) {
    return "Konto z tym adresem e-mail już istnieje. Zaloguj się lub użyj odzyskiwania hasła.";
  }
  if (
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("429")
  ) {
    return "Zbyt wiele prób. Spróbuj za chwilę.";
  }
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("connection")
  ) {
    return "Błąd połączenia. Sprawdź internet i spróbuj ponownie.";
  }

  return "Wystąpił błąd logowania. Spróbuj ponownie.";
}
