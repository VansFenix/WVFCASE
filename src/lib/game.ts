import { randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activity, inventory, users } from "@/db/schema";
import { AppError } from "@/lib/auth";
import { caseMap, featuredSkins, getCasePool, skinMap, type Skin } from "@/lib/catalog";
import type { GameResponse, GameState, InventoryEntry } from "@/lib/types";

function entry(row: typeof inventory.$inferSelect): InventoryEntry {
  return { id: row.id, itemId: row.itemId, caseId: row.caseId, createdAt: row.createdAt.toISOString() };
}

export async function getGameState(userId: string): Promise<GameState> {
  const [[user], items, history] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(inventory).where(and(eq(inventory.userId, userId), eq(inventory.status, "owned"))).orderBy(desc(inventory.createdAt)),
    db.select().from(activity).where(eq(activity.userId, userId)).orderBy(desc(activity.createdAt)).limit(50),
  ]);
  if (!user) throw new AppError("Войди в аккаунт ещё раз.", 401);
  return {
    user: { id: user.id, name: user.name, email: user.email, guest: !user.email, coins: user.coins, opened: user.opened, dailyAt: user.dailyAt?.toISOString() ?? null, promoClaimed: user.promoClaimed, createdAt: user.createdAt.toISOString() },
    inventory: items.map(entry),
    history: history.map((h) => ({ id: h.id, type: h.type, title: h.title, itemId: h.itemId, amount: h.amount, createdAt: h.createdAt.toISOString() })),
  };
}

const random = () => randomInt(0, 1000000000) / 1000000000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseIds(input: unknown) {
  if (!Array.isArray(input) || !input.length || input.length > 1000 || input.some((id) => typeof id !== "string" || !uuid.test(id))) throw new AppError("Выбери предметы из своего инвентаря.");
  const ids = [...new Set(input as string[])];
  if (ids.length !== input.length) throw new AppError("Один предмет нельзя использовать дважды.");
  return ids;
}

type Outcome = { drops: InventoryEntry[]; message?: string; won?: boolean; chance?: number };

export async function performAction(userId: string, input: Record<string, unknown>): Promise<GameResponse> {
  const result = await db.transaction(async (tx): Promise<Outcome> => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new AppError("Сессия истекла.", 401);
    const addEvent = (type: string, title: string, amount = 0, itemId: string | null = null) => tx.insert(activity).values({ userId, type, title, amount, itemId });
    const credit = (amount: number) => tx.update(users).set({ coins: Math.min(1000000000, user.coins + amount) }).where(eq(users.id, userId));
    const ownedItems = async (ids: string[]) => {
      const rows = await tx.select().from(inventory).where(and(eq(inventory.userId, userId), eq(inventory.status, "owned"), inArray(inventory.id, ids))).for("update");
      if (rows.length !== ids.length) throw new AppError("Некоторые предметы уже использованы. Обнови инвентарь.");
      return rows;
    };
    const addItem = async (skin: Skin, caseId: string) => {
      const [item] = await tx.insert(inventory).values({ userId, itemId: skin.id, caseId }).returning();
      return entry(item);
    };

    if (input.action === "open") {
      const c = typeof input.caseId === "string" ? caseMap[input.caseId] : null;
      const quantity = Number(input.quantity ?? 1);
      if (!c || ![1, 2, 3, 5].includes(quantity)) throw new AppError("Кейс или количество не найдены.");
      const cost = c.cost * quantity;
      if (user.coins < cost) throw new AppError("Не хватает монет. Забери бесплатное пополнение!");
      const pool = getCasePool(c);
      if (!pool.length) throw new AppError("Этот кейс пока недоступен.");
      const total = pool.reduce((sum, p) => sum + p.weight, 0);
      const drops: InventoryEntry[] = [];
      for (let i = 0; i < quantity; i++) {
        let roll = random() * total;
        let winner = pool[pool.length - 1].skin;
        for (const p of pool) { roll -= p.weight; if (roll < 0) { winner = p.skin; break; } }
        drops.push(await addItem(winner, c.id));
        await addEvent("open", c.name, -c.cost, winner.id);
      }
      await tx.update(users).set({ coins: user.coins - cost, opened: user.opened + quantity }).where(eq(users.id, userId));
      return { drops };
    }

    if (input.action === "sell") {
      const ids = parseIds(input.itemIds);
      const rows = await ownedItems(ids);
      const value = rows.reduce((sum, row) => sum + (skinMap[row.itemId]?.value ?? 0), 0);
      await tx.update(inventory).set({ status: "sold" }).where(inArray(inventory.id, ids));
      await credit(value);
      await addEvent("sell", `Продажа предметов: ${ids.length}`, value);
      return { drops: [], message: `Предметы проданы за ${value.toLocaleString("ru-RU")} G` };
    }

    if (input.action === "daily") {
      if (user.dailyAt && Date.now() - user.dailyAt.getTime() < 86400000) throw new AppError("Бонус уже получен. Новый будет доступен через 24 часа после получения.");
      await tx.update(users).set({ coins: Math.min(1000000000, user.coins + 2500), dailyAt: new Date() }).where(eq(users.id, userId));
      await addEvent("bonus", "Ежедневный бонус", 2500);
      return { drops: [], message: "+2 500 G — ежедневный бонус твой!" };
    }

    if (input.action === "refill") {
      await credit(5000);
      await addEvent("bonus", "Бесплатное пополнение", 5000);
      return { drops: [], message: "+5 000 G на твой виртуальный баланс!" };
    }

    if (input.action === "promo") {
      if (typeof input.code !== "string" || input.code.trim().toUpperCase() !== "WVFSTART") throw new AppError("Промокод не найден. Попробуй WVFSTART.");
      if (user.promoClaimed) throw new AppError("Этот промокод уже активирован в твоём аккаунте.");
      await tx.update(users).set({ coins: Math.min(1000000000, user.coins + 1500), promoClaimed: true }).where(eq(users.id, userId));
      await addEvent("bonus", "Промокод WVFSTART", 1500);
      return { drops: [], message: "Промокод активирован. +1 500 G!" };
    }

    if (input.action === "upgrade") {
      const ids = parseIds([input.inventoryId]);
      const [source] = await ownedItems(ids);
      const from = skinMap[source.itemId];
      const target = typeof input.targetId === "string" ? skinMap[input.targetId] : null;
      if (!from || !target || target.value <= from.value) throw new AppError("Выбери предмет дороже исходного.");
      const chance = Math.min(0.75, (from.value / target.value) * 0.85);
      const won = random() < chance;
      await tx.update(inventory).set({ status: "used" }).where(eq(inventory.id, source.id));
      const drops = won ? [await addItem(target, "upgrade")] : [];
      await addEvent("upgrade", won ? "Успешный апгрейд" : "Неудачный апгрейд", 0, won ? target.id : from.id);
      return { drops, won, chance, message: won ? "Апгрейд успешен! Предмет в инвентаре." : "В этот раз не повезло. Исходный предмет использован." };
    }

    if (input.action === "contract") {
      const ids = parseIds(input.itemIds);
      if (ids.length < 3 || ids.length > 10) throw new AppError("Для контракта нужно от 3 до 10 предметов.");
      const rows = await ownedItems(ids);
      const total = rows.reduce((sum, row) => sum + (skinMap[row.itemId]?.value ?? 0), 0);
      let choices = featuredSkins.filter((s) => s.value >= total * 0.45 && s.value <= total * 2);
      if (!choices.length) choices = [...featuredSkins].sort((a, b) => Math.abs(a.value - total) - Math.abs(b.value - total)).slice(0, 3);
      const winner = choices[randomInt(choices.length)];
      await tx.update(inventory).set({ status: "used" }).where(inArray(inventory.id, ids));
      const drop = await addItem(winner, "contract");
      await addEvent("contract", `Контракт из ${ids.length} предметов`, 0, winner.id);
      return { drops: [drop], won: true, message: "Контракт выполнен. Новый предмет уже в инвентаре!" };
    }
    throw new AppError("Неизвестное действие.");
  });
  return { ...(await getGameState(userId)), ...result };
}
