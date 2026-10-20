import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSchoolSnapshot, type SchoolSnapshot } from "@/lib/school-data.functions";

export function useSchoolData() {
  const fetchSnapshot = useServerFn(getSchoolSnapshot);
  const [data, setData] = useState<SchoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await fetchSnapshot();
      setData(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepavyko įkelti duomenų.");
    } finally {
      setLoading(false);
    }
  }, [fetchSnapshot]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
