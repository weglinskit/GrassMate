import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/db/supabase.browser";

interface UserMenuProps {
  /** Gdy true, pokazuje przycisk wylogowania. */
  isLoggedIn: boolean;
}

/**
 * Menu użytkownika z akcją wylogowania.
 * Wyświetlaj tylko gdy użytkownik jest zalogowany (np. w Layout).
 */
export function UserMenu({ isLoggedIn }: UserMenuProps) {
  const handleSignOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/login";
  }, []);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      aria-label="Wyloguj się z aplikacji"
    >
      Wyloguj się
    </Button>
  );
}
