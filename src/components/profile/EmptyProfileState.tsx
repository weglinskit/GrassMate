import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyProfileStateProps {
  className?: string;
}

/**
 * Stan pusty widoku profilu — wyświetlany gdy użytkownik nie ma aktywnego profilu trawnika.
 * Kieruje użytkownika na dashboard, gdzie może utworzyć profil (ProfileCreateForm).
 */
export function EmptyProfileState({ className }: EmptyProfileStateProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Brak aktywnego profilu trawnika</CardTitle>
        <CardDescription>
          Nie masz aktywnego profilu trawnika. Utwórz profil na dashboardzie, aby
          rozpocząć planowanie pielęgnacji trawnika.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a
          href="/"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Przejdź do Dashboard
        </a>
      </CardContent>
    </Card>
  );
}
