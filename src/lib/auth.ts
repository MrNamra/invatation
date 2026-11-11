import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAuthSettings,
  listHostUsers,
  updateHostUser,
  upsertSeedHostUser,
} from "@/lib/db";
import type {
  AuthSettings,
  HostUserRecord,
  PublicHostUser,
} from "@/types/invitation";

export const SESSION_COOKIE_NAME = "patrika_host_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const ENV_FILE_PATH = path.join(process.cwd(), ".env");
const LOCAL_SECRET_PATH = path.join(process.cwd(), ".data", "session.secret");

let cachedDotEnvMtime = -1;
let cachedDotEnvMap: Record<string, string> = {};

function readDotEnvMap(): Record<string, string> {
  try {
    const stat = fs.statSync(ENV_FILE_PATH);
    if (stat.mtimeMs !== cachedDotEnvMtime) {
      const raw = fs.readFileSync(ENV_FILE_PATH, "utf8");
      const map: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const k = trimmed.slice(0, eqIdx).trim();
        let v = trimmed.slice(eqIdx + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        map[k] = v;
      }
      cachedDotEnvMtime = stat.mtimeMs;
      cachedDotEnvMap = map;
    }
    return cachedDotEnvMap;
  } catch {
    return {};
  }
}

export function getConfigEnv(key: string): string {
  const dotEnv = readDotEnvMap();
  const fromFile = dotEnv[key]?.trim();
  if (fromFile) return fromFile;
  return process.env[key]?.trim() ?? "";
}

function getSessionSecret(): string {
  const explicit = getConfigEnv("AUTH_SESSION_SECRET");
  if (explicit.length >= 16) {
    return explicit;
  }
  const serviceRole = getConfigEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRole) {
    return crypto
      .createHmac("sha256", serviceRole)
      .update("patrika-studio-session-key-v1")
      .digest("hex");
  }
  try {
    return fs.readFileSync(LOCAL_SECRET_PATH, "utf8").trim();
  } catch {
    const generated = crypto.randomBytes(32).toString("hex");
    try {
      fs.mkdirSync(path.dirname(LOCAL_SECRET_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_SECRET_PATH, generated, { mode: 0o600 });
    } catch {
      // Non-fatal in read-only edge envs
    }
    return generated;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const derived = crypto.scryptSync(password, salt, 64);
    if (expected.length !== derived.length) return false;
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function computeEnvSyncTag(email: string, password: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${email.trim().toLowerCase()}:${password}`)
    .digest("hex");
}

let seedMutex: Promise<unknown> = Promise.resolve();

function runSeedSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = seedMutex.then(fn, fn);
  seedMutex = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export async function getAuthRuntimeState(): Promise<{
  authSettings: AuthSettings;
  users: HostUserRecord[];
}> {
  return runSeedSerialized(async () => {
    const [rawSettings, existingUsers] = await Promise.all([
      getAuthSettings(),
      listHostUsers(),
    ]);

    const allowRegEnv = getConfigEnv("ALLOW_REGISTRATION").toLowerCase();
    const registrationEnabled =
      rawSettings.registration_enabled === true && allowRegEnv === "true";

    const authSettings: AuthSettings = {
      ...rawSettings,
      registration_enabled: registrationEnabled,
      max_users: Math.max(1, rawSettings.max_users || 1),
    };

    const envEmail = (getConfigEnv("HOST_ADMIN_EMAIL") || "admin@patrika.local")
      .trim()
      .toLowerCase();
    const envPassword = getConfigEnv("HOST_ADMIN_PASSWORD");
    let users = existingUsers;

    if (users.length === 0 && envPassword) {
      const now = new Date().toISOString();
      const seeded = await upsertSeedHostUser({
        id: crypto.randomUUID(),
        email: envEmail,
        password_hash: hashPassword(envPassword),
        display_name: "Host Admin",
        role: "host",
        is_active: true,
        env_sync_tag: computeEnvSyncTag(envEmail, envPassword),
        created_at: now,
        updated_at: now,
      });
      users = [seeded];
    } else if (users.length === 1 && envPassword && users[0].env_sync_tag) {
      const nextTag = computeEnvSyncTag(envEmail, envPassword);
      if (nextTag !== users[0].env_sync_tag) {
        const updated = await updateHostUser(users[0].id, {
          email: envEmail,
          password_hash: hashPassword(envPassword),
          env_sync_tag: nextTag,
        });
        if (updated) {
          users = [updated];
        }
      }
    }

    return { authSettings, users };
  });
}

export function getPrimaryActiveHost(
  users: HostUserRecord[]
): HostUserRecord | null {
  const active = users.filter((u) => u.is_active);
  return active[0] ?? null;
}

export function toPublicHostUser(user: HostUserRecord): PublicHostUser {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
  };
}

export async function verifySingleHostLogin(
  emailInput: string,
  passwordInput: string
): Promise<
  | { ok: true; user: PublicHostUser; token: string }
  | { ok: false; status: number; error: string }
> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !passwordInput) {
    return {
      ok: false,
      status: 400,
      error: "Email and password are required",
    };
  }

  const { users } = await getAuthRuntimeState();
  const primary = getPrimaryActiveHost(users);

  if (!primary) {
    return {
      ok: false,
      status: 401,
      error: "No active host account configured in .env",
    };
  }

  // Enforce strict single-user login: only the primary single host may sign in.
  if (email !== primary.email.toLowerCase()) {
    return {
      ok: false,
      status: 401,
      error: "Invalid email or password",
    };
  }

  if (!verifyPassword(passwordInput, primary.password_hash)) {
    return {
      ok: false,
      status: 401,
      error: "Invalid email or password",
    };
  }

  const token = createSessionToken(primary);
  return {
    ok: true,
    user: toPublicHostUser(primary),
    token,
  };
}

export async function attemptRegisterHost(): Promise<{
  ok: false;
  status: number;
  error: string;
}> {
  const { authSettings, users } = await getAuthRuntimeState();
  if (!authSettings.registration_enabled) {
    return {
      ok: false,
      status: 403,
      error:
        "Registration is disabled by default. Only the configured host user can sign in.",
    };
  }
  if (users.length >= authSettings.max_users) {
    return {
      ok: false,
      status: 403,
      error:
        "Single-user login mode active: maximum number of host accounts has been reached.",
    };
  }
  return {
    ok: false,
    status: 403,
    error: "Registration is disabled.",
  };
}

interface SessionTokenPayload {
  uid: string;
  email: string;
  role: "host";
  exp: number;
}

export function createSessionToken(user: HostUserRecord): string {
  const payload: SessionTokenPayload = {
    uid: user.id,
    email: user.email.toLowerCase(),
    role: "host",
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${sig}`;
}

function parseAndVerifyToken(token: string): SessionTokenPayload | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;
  const encodedPayload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!encodedPayload || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(sig, "utf8");
    const expBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionTokenPayload;

    if (!payload.uid || !payload.email || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getHostSession(): Promise<PublicHostUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const parsed = parseAndVerifyToken(token);
  if (!parsed) return null;

  const { users } = await getAuthRuntimeState();
  const primary = getPrimaryActiveHost(users);
  if (
    !primary ||
    primary.id !== parsed.uid ||
    primary.email.toLowerCase() !== parsed.email.toLowerCase()
  ) {
    return null;
  }

  return toPublicHostUser(primary);
}

export async function requireHostApiSession(): Promise<
  | { user: PublicHostUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  const user = await getHostSession();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

export function isRequestSecure(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim().toLowerCase() === "https";
  }
  return request.url.startsWith("https://");
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  secure: boolean
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(
  response: NextResponse,
  secure: boolean
): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}
