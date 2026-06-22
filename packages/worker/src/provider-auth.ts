export interface ProviderAccount {
  id: string;
  provider_id: string;
  display_name: string;
  status: "active" | "disabled";
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authenticateProvider(db: D1Database, request: Request): Promise<ProviderAccount | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      "SELECT id, provider_id, display_name, status FROM provider_accounts WHERE token_hash = ?",
    )
    .bind(tokenHash)
    .first<ProviderAccount>();

  if (!row || row.status !== "active") return null;
  return row;
}

export async function providerTokenHash(token: string): Promise<string> {
  return await sha256Hex(token);
}
