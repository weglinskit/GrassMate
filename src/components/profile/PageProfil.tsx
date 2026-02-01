import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLoader } from "@/components/dashboard/DashboardLoader";
import { EmptyProfileState } from "./EmptyProfileState";
import { ErrorState } from "./ErrorState";
import { ProfileEditForm } from "./ProfileEditForm";
import type { LawnProfile } from "@/types";

/** Endpoint PATCH /api/lawn-profiles/:id — wdrożony. */
const PATCH_AVAILABLE = true;

async function fetchActiveProfile(): Promise<LawnProfile | null> {
  const res = await fetch("/api/lawn-profiles/active");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }
  const json = await res.json();
  return json.data;
}

function showErrorToast(status: number, message?: string): void {
  switch (status) {
    case 401:
      toast.error("Sesja wygasła", {
        description: "Zaloguj się ponownie.",
      });
      if (typeof window !== "undefined") {
        const returnUrl = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `/login?returnUrl=${returnUrl}`;
      }
      return;
    case 403:
      toast.error("Brak dostępu", {
        description: message ?? "Brak dostępu do profilu.",
      });
      break;
    case 404:
      toast.error("Nie znaleziono", {
        description: message ?? "Profil nie został znaleziony.",
      });
      break;
    case 429:
      toast.error("Zbyt wiele żądań", {
        description: "Spróbuj później.",
      });
      break;
    case 500:
    default:
      toast.error("Błąd serwera", {
        description: message ?? "Wystąpił błąd serwera.",
      });
  }
}

export function PageProfil() {
  const queryClient = useQueryClient();
  const profileErrorShown = useRef(false);

  const activeQuery = useQuery({
    queryKey: ["lawn-profiles", "active"],
    queryFn: fetchActiveProfile,
    retry: false,
  });

  const profile = activeQuery.data ?? null;
  const profileError = activeQuery.error as
    | { status?: number; message?: string }
    | undefined;

  useEffect(() => {
    if (profileError && !profileErrorShown.current) {
      showErrorToast(profileError.status ?? 500, profileError.message);
      profileErrorShown.current = true;
    }
    if (!profileError) profileErrorShown.current = false;
  }, [profileError]);

  const handleFormSuccess = useCallback(
    (updated: LawnProfile) => {
      queryClient.setQueryData(["lawn-profiles", "active"], updated);
      toast.success("Profil zaktualizowany");
    },
    [queryClient]
  );

  if (activeQuery.isPending || activeQuery.isLoading) {
    return <DashboardLoader variant="profile" />;
  }

  if (profileError?.status === 401) {
    return <DashboardLoader variant="profile" />;
  }

  if (profileError) {
    return (
      <ErrorState
        message="Wystąpił błąd podczas ładowania profilu."
        onRetry={() => activeQuery.refetch()}
      />
    );
  }

  if (!profile) {
    return <EmptyProfileState />;
  }

  return (
    <ProfileEditForm
      profile={profile}
      onSuccess={handleFormSuccess}
      patchAvailable={PATCH_AVAILABLE}
    />
  );
}
