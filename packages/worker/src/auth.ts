// ADR 0023: moderator-only actions are gated by a bearer token. MODERATOR_TOKENS is a
// JSON object mapping token -> moderator id, so an approval records a real reviewer in
// change_log rather than an anonymous one.

export function authenticateModerator(env: Env, request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token || !env.MODERATOR_TOKENS) return null;

  let map: Record<string, string>;
  try {
    map = JSON.parse(env.MODERATOR_TOKENS) as Record<string, string>;
  } catch {
    return null;
  }
  const moderator = map[token];
  return typeof moderator === "string" && moderator.length > 0 ? moderator : null;
}
