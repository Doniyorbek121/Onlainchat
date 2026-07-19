/** Reads the double-submit CSRF token from the `oc_csrf` cookie (client only). */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)oc_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * `fetch` wrapper that attaches the CSRF token header to mutating requests.
 * Use for every client-initiated POST/PATCH/PUT/DELETE to the app's API.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (method !== "GET" && method !== "HEAD") {
    headers.set("x-csrf-token", getCsrfToken());
  }
  return fetch(input, { ...init, headers });
}
