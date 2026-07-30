/**
 * Extracts the real error message from a Supabase Edge Function invoke error.
 * `supabase.functions.invoke` throws a generic "non-2xx status code" error,
 * hiding the JSON body the function actually returned.
 */
export async function readFunctionError(error: unknown, fallback = "Request failed"): Promise<string> {
  const anyErr = error as { context?: Response; message?: string };
  const res = anyErr?.context;
  if (res && typeof res.text === "function") {
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const detail = Array.isArray(json?.details) ? json.details.join(", ") : json?.details;
        return [json?.error, detail].filter(Boolean).join(" — ") || text || fallback;
      } catch {
        return text || fallback;
      }
    } catch {
      /* ignore */
    }
  }
  return anyErr?.message || fallback;
}
