import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("wvf_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Игрок"),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  coins: integer("coins").notNull().default(5000),
  opened: integer("opened").notNull().default(0),
  dailyAt: timestamp("daily_at", { withTimezone: true }),
  promoClaimed: boolean("promo_claimed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("wvf_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [index("wvf_session_user_idx").on(table.userId)]);

export const inventory = pgTable("wvf_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  caseId: text("case_id").notNull(),
  status: text("status").notNull().default("owned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("wvf_inventory_owner_idx").on(table.userId, table.status)]);

export const activity = pgTable("wvf_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  itemId: text("item_id"),
  amount: integer("amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("wvf_activity_user_idx").on(table.userId, table.createdAt)]);
