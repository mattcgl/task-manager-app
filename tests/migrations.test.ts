import { jest, test, expect } from '@jest/globals';
import {
  migrateDatabase,
  SCHEMA_VERSION,
  type MigrationDatabase,
} from '../src/data/migrations';

function database(version: number) {
  const db = {
    execAsync: jest.fn(async (_sql: string) => {}),
    getFirstAsync: jest.fn(async () => ({ user_version: version })),
    withTransactionAsync: jest.fn(async (work: () => Promise<void>) => {
      await work();
    }),
  };
  return db;
}

test('initial schema and version update run in one transaction', async () => {
  const db = database(0);
  await migrateDatabase(db as MigrationDatabase);
  expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
  expect(db.execAsync).toHaveBeenLastCalledWith(
    `PRAGMA user_version = ${SCHEMA_VERSION};`,
  );
});

test('already migrated database is not recreated', async () => {
  const db = database(SCHEMA_VERSION);
  await migrateDatabase(db as MigrationDatabase);
  expect(db.withTransactionAsync).not.toHaveBeenCalled();
});

test('future schema is refused without migration writes', async () => {
  const db = database(SCHEMA_VERSION + 1);
  await expect(migrateDatabase(db as MigrationDatabase)).rejects.toThrow(
    'newer app',
  );
  expect(db.withTransactionAsync).not.toHaveBeenCalled();
});

test('schema failure does not advance the version', async () => {
  const db = database(0);
  db.execAsync.mockImplementation(async (sql) => {
    if (sql.includes('CREATE TABLE')) throw new Error('disk full');
  });
  await expect(migrateDatabase(db as MigrationDatabase)).rejects.toThrow(
    'disk full',
  );
  expect(db.execAsync).not.toHaveBeenCalledWith(
    `PRAGMA user_version = ${SCHEMA_VERSION};`,
  );
});
