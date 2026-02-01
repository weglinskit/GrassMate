import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageProfil } from "./PageProfil";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });
}

export function ProfileWithProviders() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PageProfil />
    </QueryClientProvider>
  );
}
