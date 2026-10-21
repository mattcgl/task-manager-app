import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../../src/data/migrations';
import type { TaskDatabase } from '../../src/data/tasks';

export async function testDatabase(path = ':memory:') {
  const db = new DatabaseSync(path);
  const queries = {
    async runAsync(sql: string, ...values: (string | number | null)[]) {
      return db.prepare(sql).run(...values);
    },
    async getFirstAsync<T>(sql: string, ...values: (string | number | null)[]) {
      return (db.prepare(sql).get(...values) as T) ?? null;
    },
    async getAllAsync<T>(sql: string, ...values: (string | number | null)[]) {
      return db.prepare(sql).all(...values) as T[];
    },
  };
  const api: TaskDatabase = {
    ...queries,
    async withExclusiveTransactionAsync(work) {
      db.exec('BEGIN');
      try {
        await work(queries);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  await migrateDatabase({
    async execAsync(sql) {
      db.exec(sql);
    },
    getFirstAsync: queries.getFirstAsync,
    async withTransactionAsync(work) {
      await api.withExclusiveTransactionAsync(async () => work());
    },
  });
  return { db, api };
}
