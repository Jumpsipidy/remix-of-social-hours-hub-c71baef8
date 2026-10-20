import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSchoolSnapshot, type SchoolSnapshot } from "@/lib/school-data.functions";

/**
 * Bendra mokyklos momentinė kopija visiems /mokytojas puslapiams.
 * TanStack Query talpykla: pirmas įkėlimas – viena užklausa, kiti
 * puslapiai naudoja talpyklą (60 s), todėl navigacija akimirksniu.
 */
export const schoolSnapshotQuery = queryOptions({
  queryKey: ["school-snapshot"],
  queryFn: () => getSchoolSnapshot(),
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
});

export function useSchoolData(): {
  data: SchoolSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const query = useQuery(schoolSnapshotQuery);
  return {
    data: query.data ?? null,
    loading: query.isPending || query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : "Nepavyko įkelti duomenų.") : null,
    refresh: async () => { await query.refetch(); },
  };
}
