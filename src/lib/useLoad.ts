import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../api/client";

/**
 * Loads data once on mount and on demand. Screens use it for every read so loading and error
 * handling is identical everywhere: `data` is undefined until the first success.
 *
 *   const { data, loading, error, reload } = useLoad(() => getFoo().then(r => r.data.data ?? []), []);
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setError("");
    try { setData(await fn()); }
    catch (e) { setError(errorMessage(e, "Could not load this screen.")); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { setLoading(true); reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}

/** Unwraps the API envelope {success,message,data}. */
export const unwrap = <T,>(res: { data: any }): T => (res.data?.data ?? res.data) as T;
