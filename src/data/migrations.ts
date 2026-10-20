// This small interface lets us test migration behavior without a phone.
export interface MigrationDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  withTransactionAsync(work: () => Promise<void>): Promise<void>;
}

export const SCHEMA_VERSION = 2;

export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('foundation_note', '');
`;

export const TASK_SCHEMA = `
CREATE TABLE tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
  notes TEXT NOT NULL DEFAULT '',
  dueDate TEXT,
  plannedDate TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL CHECK(status IN ('open', 'completed')),
  completedAt TEXT,
  archivedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE task_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT UNIQUE NOT NULL,
  taskId TEXT NOT NULL REFERENCES tasks(id),
  kind TEXT NOT NULL,
  occurredAt TEXT NOT NULL,
  localDate TEXT NOT NULL,
  timeZone TEXT NOT NULL,
  snapshot TEXT NOT NULL
);
CREATE INDEX task_events_history ON task_events(taskId, occurredAt);
CREATE TABLE weekly_commitments (
  id TEXT PRIMARY KEY NOT NULL,
  taskId TEXT NOT NULL REFERENCES tasks(id),
  weekStart TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  withdrawnAt TEXT,
  UNIQUE(taskId, weekStart)
);
CREATE INDEX commitments_week ON weekly_commitments(weekStart);
CREATE INDEX tasks_dates ON tasks(status, archivedAt, plannedDate, dueDate);
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
    if (version < 1) await db.execAsync(INITIAL_SCHEMA);
    if (version < 2) await db.execAsync(TASK_SCHEMA);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  });
}
