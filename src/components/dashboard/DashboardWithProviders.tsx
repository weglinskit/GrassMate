import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageDashboard } from "./PageDashboard";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });
}

export function DashboardWithProviders() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PageDashboard />
    </QueryClientProvider>
  );
}
