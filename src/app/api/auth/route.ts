import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppError, checkOrigin, currentUser, endSession, ensurePlayer, errorResponse, hashPassword, rateLimit, startSession, verifyPassword } from "@/lib/auth";
import { getGameState } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  try { const user = await ensurePlayer(); return Response.json(await getGameState(user.id)); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    rateLimit(`auth:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`, 20);
    const body = await request.json();
    if (!body || typeof body !== "object") throw new AppError("Заполни данные аккаунта.");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new AppError("Введи корректный email.");
    if (password.length < 8 || password.length > 128) throw new AppError("Пароль должен содержать от 8 до 128 символов.");

    if (body.action === "login") {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) throw new AppError("Неверный email или пароль.", 401);
      await startSession(user.id);
      return Response.json(await getGameState(user.id));
    }

    if (body.action === "register") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 24) throw new AppError("Никнейм должен содержать от 2 до 24 символов.");
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (exists) throw new AppError("Этот email уже зарегистрирован. Войди в аккаунт.");
      const current = await currentUser();
      if (current?.email) throw new AppError("Сначала выйди из текущего аккаунта.");
      const passwordHash = hashPassword(password);
      let userId: string;
      if (current) {
        const [user] = await db.update(users).set({ name, email, passwordHash }).where(and(eq(users.id, current.id), isNull(users.email))).returning({ id: users.id });
        if (!user) throw new AppError("Аккаунт уже зарегистрирован. Обнови страницу.");
        userId = user.id;
      } else {
        const [user] = await db.insert(users).values({ name, email, passwordHash }).returning({ id: users.id });
        userId = user.id;
      }
      await startSession(userId);
      return Response.json(await getGameState(userId), { status: 201 });
    }
    throw new AppError("Выбери вход или регистрацию.");
  } catch (error) {
    if ((error as { cause?: { code?: string } })?.cause?.code === "23505") return Response.json({ error: "Этот email уже зарегистрирован." }, { status: 409 });
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try { checkOrigin(request); await endSession(); return Response.json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
