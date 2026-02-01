import { Skeleton } from "@/components/ui/skeleton";

type DashboardLoaderVariant = "profile" | "treatments";

interface DashboardLoaderProps {
  variant?: DashboardLoaderVariant;
}

export function DashboardLoader({ variant = "treatments" }: DashboardLoaderProps) {
  if (variant === "profile") {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-label="Ładowanie formularza profilu"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full max-w-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full max-w-md" />
        </div>
        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full max-w-[140px]" />
        </div>
        <Skeleton className="h-10 w-32 mt-6" />
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Ładowanie listy zabiegów"
    >
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[100px] w-full rounded-xl" />
      </div>
    </div>
  );
}
