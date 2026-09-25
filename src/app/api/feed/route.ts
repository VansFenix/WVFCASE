import { count, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { activity, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [drops, [stats]] = await Promise.all([
      db.select({ id: activity.id, itemId: activity.itemId, name: users.name, createdAt: activity.createdAt }).from(activity).innerJoin(users, eq(activity.userId, users.id)).where(eq(activity.type, "open")).orderBy(desc(activity.createdAt)).limit(12),
      db.select({ players: count(), openings: sum(users.opened) }).from(users),
    ]);
    return Response.json({ drops, players: stats.players, openings: Number(stats.openings || 0) });
  } catch { return Response.json({ drops: [], players: 0, openings: 0 }); }
}
