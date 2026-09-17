/** crypto.randomUUID() is only available in secure contexts (HTTPS or
 * localhost), so it throws when the app is served over plain HTTP on any
 * other host — which is exactly how it runs inside Docker. Fall back to a
 * non-cryptographic id in that case; these ids are only used as React keys. */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to the fallback below
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
