/**
 * Runs a real PostgreSQL server locally without Docker (downloads official
 * binaries via the `embedded-postgres` package). Development only.
 *
 *   npm run db:local     → postgresql://sotuvai:sotuvai@localhost:54329/sotuvai
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.resolve(process.cwd(), ".local-pg");
const port = Number(process.env.LOCAL_PG_PORT ?? 54329);

async function main() {
  const firstRun = !fs.existsSync(path.join(dataDir, "PG_VERSION"));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "sotuvai",
    password: "sotuvai",
    port,
    persistent: true,
    onLog: () => {},
  });
  if (firstRun) await pg.initialise();
  await pg.start();
  for (const name of ["sotuvai", "sotuvai_test"]) {
    try {
      await pg.createDatabase(name);
    } catch {
      // already exists
    }
  }
  console.log(`PostgreSQL running on postgresql://sotuvai:sotuvai@localhost:${port}/sotuvai (Ctrl+C to stop)`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
