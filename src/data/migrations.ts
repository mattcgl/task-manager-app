// This small interface lets us test migration behavior without a phone.
export interface MigrationDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  withTransactionAsync(work: () => Promise<void>): Promise<void>;
}

export const SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('foundation_note', '');
`;

export async function migrateDatabase(db: MigrationDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;',
  );
  const version = row?.user_version ?? 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(
      'This database needs a newer app version. Update the app to continue.',
    );
  }
  if (version === SCHEMA_VERSION) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync(INITIAL_SCHEMA);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  });
}
