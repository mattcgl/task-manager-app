/** @jest-environment node */
import { expect, test } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  migrateDatabase,
  SCHEMA_VERSION,
  INITIAL_SCHEMA,
  type MigrationDatabase,
} from '../src/data/migrations';

function adapter(db: DatabaseSync): MigrationDatabase {
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async getFirstAsync<T>(sql: string) {
      return (db.prepare(sql).get() as T) ?? null;
    },
    async withTransactionAsync(work) {
      db.exec('BEGIN');
      try {
        await work();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

test('real SQLite migration preserves saved data across reopening and rerunning', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'task-goal-test-'));
  const path = join(directory, 'test.db');
  let db = new DatabaseSync(path);
  try {
    // Start from the shipped M1 schema to verify a real user upgrade.
    db.exec(INITIAL_SCHEMA);
    db.exec('PRAGMA user_version = 1;');
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
      "Read a chapter's notes",
      'foundation_note',
    );
    db.close();
    db = new DatabaseSync(path);
    await migrateDatabase(adapter(db));
    expect(
      db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('foundation_note')?.value,
    ).toBe("Read a chapter's notes");
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(
      SCHEMA_VERSION,
    );
    expect(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1);
  } finally {
    db.close();
    unlinkSync(path);
    rmdirSync(directory);
  }
});

test('a failed migration rolls back real schema changes', async () => {
  const db = new DatabaseSync(':memory:');
  const connection = adapter(db);
  const exec = connection.execAsync;
  connection.execAsync = async (sql) => {
    if (sql.startsWith('PRAGMA user_version ='))
      throw new Error('simulated failure');
    await exec(sql);
  };
  try {
    await expect(migrateDatabase(connection)).rejects.toThrow(
      'simulated failure',
    );
    expect(
      db
        .prepare("SELECT name FROM sqlite_master WHERE name = 'settings'")
        .get(),
    ).toBeUndefined();
    expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(0);
  } finally {
    db.close();
  }
});
