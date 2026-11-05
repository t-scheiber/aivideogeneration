import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { isEmailAllowed } from "@/lib/access";

// AUTH_DB_PATH should point at a persistent volume in production,
// otherwise sessions and users are lost on every redeploy.
const dbPath = process.env.AUTH_DB_PATH ?? path.join(process.cwd(), ".better-auth.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const authOptions = {
  // Node's built-in SQLite: no native module to compile at install time
  database: new DatabaseSync(dbPath),
  emailAndPassword: {
    enabled: false, // Only using Google OAuth
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? "",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  onAPIError: {
    errorURL: "/auth/error",
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isEmailAllowed(user.email)) {
            throw new APIError("FORBIDDEN", { message: "access_denied" });
          }
          return { data: user };
        },
      },
    },
    session: {
      create: {
        before: async (session, context) => {
          const user = context
            ? await context.context.internalAdapter.findUserById(session.userId)
            : null;
          if (!isEmailAllowed(user?.email)) {
            throw new APIError("FORBIDDEN", { message: "access_denied" });
          }
          return { data: session };
        },
      },
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);
