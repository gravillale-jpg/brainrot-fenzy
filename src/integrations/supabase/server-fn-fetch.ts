import { createIsomorphicFn } from "@tanstack/react-start";
import { supabase } from "./client";

// Inject the Supabase access token into all /_serverFn/* fetches so
// `requireSupabaseAuth` middleware can read the bearer token.
let patched = false;
export const installServerFnAuth = createIsomorphicFn()
  .server(() => {})
  .client(() => {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url && url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) {
            headers.set("authorization", `Bearer ${token}`);
          }
          init = { ...init, headers };
        }
      }
    } catch {
      // fall through to original fetch
    }
    return original(input as RequestInfo, init);
  };
});