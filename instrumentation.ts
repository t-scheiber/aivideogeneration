// Runs once when the Next.js server starts. Creates or updates the Better Auth
// tables so a fresh volume works without a separate migrate step.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getMigrations } = await import("better-auth/db/migration");
  const { authOptions } = await import("@/lib/auth");

  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(authOptions);
  if (toBeCreated.length > 0 || toBeAdded.length > 0) {
    await runMigrations();
    console.log(
      `Better Auth schema updated: ${toBeCreated.length} table(s) created, ${toBeAdded.length} table(s) altered`
    );
  }
}
