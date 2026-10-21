import {
  buildReviewSnapshot,
  emptyReflection,
  validateReflection,
  validateWeek,
  type Reflection,
  type ReviewSnapshot,
  type TaskEvent,
  type WeeklyReview,
} from '../domain/reviews';
import type { TaskDatabase, TaskQueries } from './tasks';

type ReviewRow = {
  id: string;
  weekStart: string;
  timeZone: string;
  status: 'draft' | 'finalized';
  snapshot: string;
  reflection: string;
  revision: number;
};
export type SaveReviewInput = {
  weekStart: string;
  timeZone: string;
  reflection: Reflection;
  finalize: boolean;
  expectedRevision: number;
};
function decode(row: ReviewRow): WeeklyReview {
  const snapshot = JSON.parse(row.snapshot) as ReviewSnapshot;
  if (snapshot.version !== 1)
    throw new Error('This review requires a newer app version.');
  return {
    id: row.id,
    weekStart: row.weekStart,
    timeZone: row.timeZone,
    status: row.status,
    revision: row.revision,
    snapshot,
    reflection: JSON.parse(row.reflection) as Reflection,
  };
}
async function snapshotFor(
  db: TaskQueries,
  week: string,
  zone: string,
  now: Date,
) {
  const events = await db.getAllAsync<TaskEvent>(
    'SELECT sequence, occurredAt, snapshot FROM task_events WHERE occurredAt <= ? ORDER BY occurredAt, sequence',
    now.toISOString(),
  );
  return buildReviewSnapshot(events, week, zone, now);
}
export async function loadReview(
  db: TaskQueries,
  week: string,
  zone: string,
  now = new Date(),
): Promise<WeeklyReview> {
  const row = await db.getFirstAsync<ReviewRow>(
    'SELECT * FROM weekly_reviews WHERE weekStart = ?',
    week,
  );
  if (row?.status === 'finalized') return decode(row);
  const timeZone = row?.timeZone ?? zone;
  const snapshot = await snapshotFor(db, week, timeZone, now);
  return row
    ? { ...decode(row), snapshot }
    : {
        id: null,
        weekStart: week,
        timeZone,
        status: 'draft',
        snapshot,
        reflection: emptyReflection(),
        revision: 0,
      };
}
export async function saveReview(
  db: TaskDatabase,
  input: SaveReviewInput,
  newId: () => string,
  now = new Date(),
): Promise<WeeklyReview> {
  const reflection = validateReflection(input.reflection);
  let result: WeeklyReview | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<ReviewRow>(
      'SELECT * FROM weekly_reviews WHERE weekStart = ?',
      input.weekStart,
    );
    if ((row?.revision ?? 0) !== input.expectedRevision)
      throw new Error(
        'This review changed since you opened it. Reload it before saving again.',
      );
    if (row?.status === 'finalized') {
      // Finalized metrics cannot be regenerated, even through a stale caller.
      await tx.runAsync(
        'UPDATE weekly_reviews SET reflection = ?, revision = revision + 1, updatedAt = ? WHERE id = ?',
        JSON.stringify(reflection),
        now.toISOString(),
        row.id,
      );
      result = { ...decode(row), reflection, revision: row.revision + 1 };
      return;
    }
    const zone = row?.timeZone ?? input.timeZone;
    validateWeek(input.weekStart, zone, now);
    const snapshot = await snapshotFor(tx, input.weekStart, zone, now);
    result = {
      id: row?.id ?? newId(),
      weekStart: input.weekStart,
      timeZone: zone,
      status: input.finalize ? 'finalized' : 'draft',
      snapshot,
      reflection,
      revision: (row?.revision ?? 0) + 1,
    };
    await tx.runAsync(
      `INSERT INTO weekly_reviews (id, weekStart, timeZone, status, snapshot, reflection, revision, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(weekStart) DO UPDATE SET status=excluded.status, snapshot=excluded.snapshot,
      reflection=excluded.reflection, revision=excluded.revision, updatedAt=excluded.updatedAt`,
      result.id,
      result.weekStart,
      result.timeZone,
      result.status,
      JSON.stringify(snapshot),
      JSON.stringify(reflection),
      result.revision,
      now.toISOString(),
      now.toISOString(),
    );
  });
  return result!;
}
