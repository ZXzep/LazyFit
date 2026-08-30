/**
 * Dev helper — creates (or reuses) a confirmed test user and prints a session,
 * plus the @supabase/ssr cookie(s) to paste into a browser for local E2E checks.
 *
 *   node scripts/dev-login.mjs [email] [password]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env
 * (load .env.local first, e.g. `node --env-file=.env.local scripts/dev-login.mjs`).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2] || "dev@lazyfit.test";
const password = process.argv[3] || "LazyFitDev12345!";

if (!SUPABASE_URL || !ANON) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });

let { data, error } = await sb.auth.signInWithPassword({ email, password });

if (error) {
  // user probably doesn't exist yet — create it
  const res = await sb.auth.signUp({ email, password });
  if (res.error) {
    console.error("signUp failed:", res.error.message);
    process.exit(1);
  }
  if (!res.data.session) {
    console.error(
      "User created but no session (email confirmation is ON).\n" +
        "Turn it off: Dashboard → Authentication → Providers → Email → 'Confirm email' = off,\n" +
        "or confirm the user, then re-run this script.",
    );
    process.exit(2);
  }
  data = res.data;
}

const session = data.session;
const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const cookieName = `sb-${ref}-auth-token`;

// @supabase/ssr cookie encoding: "base64-" + base64(JSON), chunked at 3180 chars.
const payload = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
const CHUNK = 3180;
const chunks =
  payload.length <= CHUNK
    ? [[cookieName, payload]]
    : Array.from({ length: Math.ceil(payload.length / CHUNK) }, (_, i) => [
        `${cookieName}.${i}`,
        payload.slice(i * CHUNK, (i + 1) * CHUNK),
      ]);

console.log(JSON.stringify({
  email,
  userId: session.user.id,
  accessToken: session.access_token,
  cookies: chunks.map(([name, value]) => ({ name, value })),
}, null, 2));
