"use client";

import useSWR, { type Key, type SWRConfiguration, type SWRResponse } from "swr";
import { useSessionReady } from "@/stores/useAdminAuthStore";

export function useProtectedSWR<Data, ErrorType = Error>(
  key: Key,
  fetcher: () => Promise<Data>,
  config?: SWRConfiguration<Data, ErrorType>,
): SWRResponse<Data, ErrorType> {
  const sessionReady = useSessionReady();

  return useSWR<Data, ErrorType>(
    sessionReady && key !== null && key !== false ? key : null,
    fetcher,
    config,
  );
}
