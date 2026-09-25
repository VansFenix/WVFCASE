import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const COOKIE = "wvf_session";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const [row] = await db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return row?.user ?? null;
}

export async function startSession(userId: string) {
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  if (old) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(old)));
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: tokenHash(token), userId, expiresAt });
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function ensurePlayer() {
  const existing = await currentUser();
  if (existing) return existing;
  const [user] = await db.insert(users).values({ name: `Игрок ${randomBytes(2).toString("hex").toUpperCase()}` }).returning();
  await startSession(user.id);
  return user;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  jar.delete(COOKIE);
}

export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return Response.json({ error: "Не удалось прочитать запрос." }, { status: 400 });
  console.error("WVFCASE request failed:", error);
  return Response.json({ error: "Не удалось выполнить действие. Попробуй ещё раз." }, { status: 500 });
}

const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit = 25) {
  const now = Date.now();
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  let bucket = attempts.get(key);
  if (!bucket || bucket.until < now) { bucket = { count: 0, until: now + 60000 }; attempts.set(key, bucket); }
  if (++bucket.count > limit) throw new AppError("Слишком много запросов. Подожди минуту.", 429);
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && new URL(origin).host !== host && new URL(origin).host !== new URL(request.url).host) throw new AppError("Запрос с другого сайта запрещён.", 403);
}
