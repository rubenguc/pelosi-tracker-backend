import { defineConfig } from "drizzle-kit";
export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/e7b702e16df378aab6b2fede18b9214625067d89a023b3a72fd2b2c3b704e86e.sqlite",
  },
});
