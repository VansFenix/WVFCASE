import { defineConfig } from "drizzle-kit";

let url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
if (!url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("sslmode=")) {
  url += url.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url,
  },
});
