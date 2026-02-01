import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema";

describe("auth.schema", () => {
  const validEmail = "user@example.com";
  const validPassword = "haslo123";

  describe("loginSchema", () => {
    it("akceptuje poprawny login (email + hasło min. 6 znaków)", () => {
      const result = loginSchema.safeParse({
        email: validEmail,
        password: validPassword,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(validEmail);
        expect(result.data.password).toBe(validPassword);
      }
    });

    it("odrzuca brak emaila", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: validPassword,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Adres e-mail jest wymagany");
      }
    });

    it("odrzuca nieprawidłowy format emaila", () => {
      const result = loginSchema.safeParse({
        email: "nie-email",
        password: validPassword,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Podaj prawidłowy adres e-mail");
      }
    });

    it("odrzuca brak hasła", () => {
      const result = loginSchema.safeParse({
        email: validEmail,
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło jest wymagane");
      }
    });

    it("odrzuca hasło krótsze niż 6 znaków", () => {
      const result = loginSchema.safeParse({
        email: validEmail,
        password: "12345",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
      }
    });

    it("akceptuje hasło dokładnie 6 znaków", () => {
      const result = loginSchema.safeParse({
        email: validEmail,
        password: "123456",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("registerSchema", () => {
    it("akceptuje poprawną rejestrację (email, hasło, zgodne potwierdzenie)", () => {
      const result = registerSchema.safeParse({
        email: validEmail,
        password: validPassword,
        passwordConfirm: validPassword,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe(result.data.passwordConfirm);
      }
    });

    it("odrzuca niezgodne hasła (refine)", () => {
      const result = registerSchema.safeParse({
        email: validEmail,
        password: validPassword,
        passwordConfirm: "innehaslo",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const refineError = result.error.issues.find(
          (i) => i.message === "Hasła muszą się zgadzać"
        );
        expect(refineError).toBeDefined();
      }
    });

    it("odrzuca brak potwierdzenia hasła", () => {
      const result = registerSchema.safeParse({
        email: validEmail,
        password: validPassword,
        passwordConfirm: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === "Potwierdzenie hasła jest wymagane")).toBe(
          true
        );
      }
    });

    it("odrzuca za krótkie hasło w rejestracji", () => {
      const result = registerSchema.safeParse({
        email: validEmail,
        password: "12345",
        passwordConfirm: "12345",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
      }
    });
  });

  describe("forgotPasswordSchema", () => {
    it("akceptuje poprawny email", () => {
      const result = forgotPasswordSchema.safeParse({ email: validEmail });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBe(validEmail);
    });

    it("odrzuca pusty email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Adres e-mail jest wymagany");
      }
    });

    it("odrzuca nieprawidłowy email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "zly" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Podaj prawidłowy adres e-mail");
      }
    });
  });

  describe("resetPasswordSchema", () => {
    it("akceptuje poprawne nowe hasło i potwierdzenie", () => {
      const result = resetPasswordSchema.safeParse({
        password: validPassword,
        passwordConfirm: validPassword,
      });
      expect(result.success).toBe(true);
    });

    it("odrzuca niezgodne hasła przy resecie (refine)", () => {
      const result = resetPasswordSchema.safeParse({
        password: validPassword,
        passwordConfirm: "inne",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === "Hasła muszą się zgadzać")).toBe(true);
      }
    });

    it("odrzuca za krótkie hasło przy resecie", () => {
      const result = resetPasswordSchema.safeParse({
        password: "12345",
        passwordConfirm: "12345",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
      }
    });

    it("odrzuca puste potwierdzenie hasła", () => {
      const result = resetPasswordSchema.safeParse({
        password: validPassword,
        passwordConfirm: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message === "Potwierdzenie hasła jest wymagane")).toBe(
          true
        );
      }
    });
  });
});
