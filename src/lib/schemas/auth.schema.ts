/**
 * Schematy Zod dla formularzy autentykacji (logowanie, rejestracja, zapomniane hasło, reset hasła).
 * Używane do walidacji po stronie klienta przed wysłaniem do Supabase Auth.
 */

import { z } from "zod";

const PASSWORD_MIN_LENGTH = 6;

/** Schemat logowania: e-mail, hasło. */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Adres e-mail jest wymagany")
    .email("Podaj prawidłowy adres e-mail"),
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .min(
      PASSWORD_MIN_LENGTH,
      `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`,
    ),
});

/** Schemat rejestracji: e-mail, hasło, potwierdzenie hasła. */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Adres e-mail jest wymagany")
      .email("Podaj prawidłowy adres e-mail"),
    password: z
      .string()
      .min(1, "Hasło jest wymagane")
      .min(
        PASSWORD_MIN_LENGTH,
        `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`,
      ),
    passwordConfirm: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła muszą się zgadzać",
    path: ["passwordConfirm"],
  });

/** Schemat zapomnianego hasła: e-mail. */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Adres e-mail jest wymagany")
    .email("Podaj prawidłowy adres e-mail"),
});

/** Schemat resetu hasła: nowe hasło, potwierdzenie. */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Hasło jest wymagane")
      .min(
        PASSWORD_MIN_LENGTH,
        `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`,
      ),
    passwordConfirm: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła muszą się zgadzać",
    path: ["passwordConfirm"],
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
