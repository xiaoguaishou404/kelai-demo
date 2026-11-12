import fs from "fs";
import path from "path";
import { createSeed } from "./seed";
import { SCHEMA_VERSION, type Database } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "db.json");

function writeDb(db: Database) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${dbFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2));
  fs.renameSync(temp, dbFile);
}

export function readDb(): Database {
  try {
    if (!fs.existsSync(dbFile)) {
      const seeded = createSeed();
      writeDb(seeded);
      return seeded;
    }
    const parsed = JSON.parse(fs.readFileSync(dbFile, "utf8")) as Database;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      const seeded = createSeed();
      writeDb(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeed();
    writeDb(seeded);
    return seeded;
  }
}

export function updateDb(mutator: (db: Database) => void): Database {
  const db = readDb();
  mutator(db);
  writeDb(db);
  return db;
}

export function resetDb(): Database {
  const seeded = createSeed();
  writeDb(seeded);
  return seeded;
}
