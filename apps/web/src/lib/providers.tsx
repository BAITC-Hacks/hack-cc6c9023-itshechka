"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { DemoProvider } from "@/features/demo/demo-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </DemoProvider>
    </QueryClientProvider>
  );
}
