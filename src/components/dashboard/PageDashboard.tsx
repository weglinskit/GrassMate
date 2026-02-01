import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth.browser";
import { DashboardLoader } from "./DashboardLoader";
import { ProfileCreateForm } from "./ProfileCreateForm";
import { TreatmentsList } from "./TreatmentsList";
import { CompleteTreatmentDrawer } from "./CompleteTreatmentDrawer";
import type { LawnProfile, Treatment, TreatmentWithEmbedded } from "@/types";

async function fetchActiveProfile(): Promise<LawnProfile | null> {
  const token = await getAccessToken();
  const res = await fetch("/api/lawn-profiles/active", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }
  const json = await res.json();
  return json.data;
}

async function fetchTreatments(
  lawnProfileId: string,
): Promise<Treatment[] | TreatmentWithEmbedded[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    status: "aktywny",
    page: "1",
    limit: "20",
    embed: "template",
  });
  const res = await fetch(
    `/api/lawn-profiles/${lawnProfileId}/treatments?${params}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }
  const json = await res.json();
  return json.data ?? [];
}

function showErrorToast(status: number, message?: string): void {
  switch (status) {
    case 401:
      toast.error("Sesja wygasła", {
        description: "Zaloguj się ponownie.",
      });
      if (typeof window !== "undefined") {
        const returnUrl = encodeURIComponent(
          window.location.pathname + window.location.search,
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

export function PageDashboard() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(
    null,
  );
  const profileErrorShown = useRef(false);
  const treatmentsErrorShown = useRef(false);

  const activeQuery = useQuery({
    queryKey: ["lawn-profiles", "active"],
    queryFn: fetchActiveProfile,
    retry: false,
  });

  const profile = activeQuery.data ?? null;
  const profileError = activeQuery.error as
    | { status?: number; message?: string }
    | undefined;

  const treatmentsQuery = useQuery({
    queryKey: ["lawn-profiles", profile?.id, "treatments"],
    queryFn: () => {
      if (!profile?.id) throw new Error("No profile");
      return fetchTreatments(profile.id);
    },
    enabled: Boolean(profile?.id),
    retry: false,
  });

  const treatmentsError = treatmentsQuery.error as
    | { status?: number; message?: string }
    | undefined;

  useEffect(() => {
    if (profileError && !profileErrorShown.current) {
      showErrorToast(profileError.status ?? 500, profileError.message);
      profileErrorShown.current = true;
    }
    if (!profileError) profileErrorShown.current = false;
  }, [profileError]);

  useEffect(() => {
    if (treatmentsError && !treatmentsErrorShown.current) {
      showErrorToast(treatmentsError.status ?? 500, treatmentsError.message);
      treatmentsErrorShown.current = true;
    }
    if (!treatmentsError) treatmentsErrorShown.current = false;
  }, [treatmentsError]);

  const handleProfileSuccess = useCallback(
    (created: LawnProfile) => {
      queryClient.setQueryData(["lawn-profiles", "active"], created);
      toast.success("Profil utworzony");
    },
    [queryClient],
  );

  const handleMarkComplete = useCallback((treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setDrawerOpen(true);
  }, []);

  const handleDrawerSuccess = useCallback(() => {
    if (profile?.id) {
      queryClient.invalidateQueries({
        queryKey: ["lawn-profiles", profile.id, "treatments"],
      });
    }
    toast.success("Zabieg oznaczony jako wykonany");
  }, [profile?.id, queryClient]);

  const handleDrawerError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  if (activeQuery.isPending || activeQuery.isLoading) {
    return <DashboardLoader variant="profile" />;
  }

  if (profileError) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">
          Wystąpił błąd podczas ładowania profilu.
        </p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => activeQuery.refetch()}
        >
          Ponów
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div data-testid="lawn-profile-create">
        <ProfileCreateForm
          onSuccess={handleProfileSuccess}
          onError={(details) => {
            if (details.some((d) => d.field === "_form")) {
              const msg = details.find((d) => d.field === "_form")?.message;
              if (msg) toast.error(msg);
            }
          }}
        />
      </div>
    );
  }

  if (treatmentsQuery.isPending || treatmentsQuery.isLoading) {
    return <DashboardLoader variant="treatments" />;
  }

  if (treatmentsError) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">
          Wystąpił błąd podczas ładowania zabiegów.
        </p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => treatmentsQuery.refetch()}
        >
          Ponów
        </button>
      </div>
    );
  }

  const treatments = treatmentsQuery.data ?? [];

  return (
    <>
      <TreatmentsList
        treatments={treatments}
        onMarkComplete={handleMarkComplete}
      />
      <CompleteTreatmentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        treatment={selectedTreatment}
        onSuccess={handleDrawerSuccess}
        onError={handleDrawerError}
      />
    </>
  );
}
