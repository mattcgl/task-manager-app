import type { SQLiteDatabase } from 'expo-sqlite';

export async function readFoundationNote(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'foundation_note',
  );
  return row?.value ?? '';
}

export async function saveFoundationNote(db: SQLiteDatabase, note: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    'foundation_note',
    note,
  );
}
