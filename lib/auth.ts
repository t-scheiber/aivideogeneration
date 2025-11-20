import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";

// Use SQLite for Better Auth
const db = new Database(path.join(process.cwd(), ".better-auth.db"));

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: false, // Only using Google OAuth
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
});
