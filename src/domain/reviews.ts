import { addDays, parseDate, weekStart } from './dates';
import type { Task } from './tasks';

export type Reflection = {
  accomplishments: string;
  unfinished: string;
  obstacles: string;
  changes: string;
  priorities: string;
};
export const emptyReflection = (): Reflection => ({
  accomplishments: '',
  unfinished: '',
  obstacles: '',
  changes: '',
  priorities: '',
});
export type TaskEvent = {
  sequence: number;
  occurredAt: string;
  snapshot: string;
};
type EventSnapshot = {
  task: Task;
  commitments: { weekStart: string; withdrawnAt: string | null }[];
};
export type ReviewItem = Pick<
  Task,
  'id' | 'title' | 'status' | 'plannedDate' | 'dueDate'
> & { committed: boolean; reason?: 'archived' | 'withdrawn' };
export type ReviewSnapshot = {
  version: 1;
  weekStart: string;
  weekEnd: string;
  timeZone: string;
  cutoff: string;
  partial: boolean;
  commitmentCount: number;
  accomplishments: ReviewItem[];
  unfinished: ReviewItem[];
  setAside: ReviewItem[];
  alreadyComplete: ReviewItem[];
};
export type WeeklyReview = {
  id: string | null;
  weekStart: string;
  timeZone: string;
  status: 'draft' | 'finalized';
  snapshot: ReviewSnapshot;
  reflection: Reflection;
  revision: number;
};

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();
export function dateInZone(date: Date, timeZone: string): string {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    zoneFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Find the first instant of a calendar date in this zone. This naturally handles
// 23/25-hour days and doesn't depend on the device's current time zone.
export function startOfDateInZone(date: string, timeZone: string): Date {
  parseDate(date);
  const anchor = Date.parse(`${date}T00:00:00.000Z`);
  let low = anchor - 36 * 60 * 60 * 1000;
  let high = anchor + 36 * 60 * 60 * 1000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (dateInZone(new Date(middle), timeZone) < date) low = middle + 1;
    else high = middle;
  }
  return new Date(low);
}

export function validateWeek(week: string, zone: string, now: Date) {
  if (weekStart(week) !== week)
    throw new Error('Choose a week beginning on Monday.');
  if (week > weekStart(dateInZone(now, zone)))
    throw new Error('Future weeks cannot be reviewed yet.');
}

export function validateReflection(reflection: Reflection): Reflection {
  const clean = emptyReflection();
  for (const key of Object.keys(clean) as (keyof Reflection)[]) {
    if (typeof reflection[key] !== 'string' || reflection[key].length > 5000)
      throw new Error('Keep each reflection under 5,001 characters.');
    clean[key] = reflection[key].trim();
  }
  return clean;
}

export function buildReviewSnapshot(
  events: TaskEvent[],
  week: string,
  zone: string,
  now = new Date(),
): ReviewSnapshot {
  validateWeek(week, zone, now);
  const nextWeek = addDays(week, 7);
  const start = startOfDateInZone(week, zone).getTime();
  const end = startOfDateInZone(nextWeek, zone).getTime();
  const cutoff = Math.min(now.getTime(), end);
  const latest = new Map<string, EventSnapshot>();
  const ordered = [...events].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.sequence - b.sequence,
  );
  for (const event of ordered) {
    const time = Date.parse(event.occurredAt);
    if (time > cutoff || time >= end) continue;
    const snapshot = JSON.parse(event.snapshot) as EventSnapshot;
    if (!snapshot.task?.id || !Array.isArray(snapshot.commitments))
      throw new Error(
        'Task history could not be read. Your saved data has not been changed.',
      );
    latest.set(snapshot.task.id, snapshot);
  }
  const result: ReviewSnapshot = {
    version: 1,
    weekStart: week,
    weekEnd: addDays(week, 6),
    timeZone: zone,
    cutoff: new Date(cutoff).toISOString(),
    partial: now.getTime() < end,
    commitmentCount: 0,
    accomplishments: [],
    unfinished: [],
    setAside: [],
    alreadyComplete: [],
  };
  for (const { task, commitments } of latest.values()) {
    const commitment = commitments.find((item) => item.weekStart === week);
    const item: ReviewItem = {
      id: task.id,
      title: task.title,
      status: task.status,
      plannedDate: task.plannedDate,
      dueDate: task.dueDate,
      committed: !!commitment,
    };
    if (commitment) result.commitmentCount++;
    const completedAt = task.completedAt ? Date.parse(task.completedAt) : NaN;
    if (
      task.status === 'completed' &&
      completedAt >= start &&
      completedAt < end &&
      completedAt <= cutoff
    ) {
      result.accomplishments.push(item);
    } else if (commitment) {
      if (task.archivedAt || commitment.withdrawnAt)
        result.setAside.push({
          ...item,
          reason: task.archivedAt ? 'archived' : 'withdrawn',
        });
      else if (task.status === 'completed') result.alreadyComplete.push(item);
      else result.unfinished.push(item);
    }
  }
  for (const list of [
    result.accomplishments,
    result.unfinished,
    result.setAside,
    result.alreadyComplete,
  ])
    list.sort(
      (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
    );
  return result;
}

export function followingWeekPlanDate(
  review: ReviewSnapshot,
  now = new Date(),
): string | null {
  const nextWeek = addDays(review.weekStart, 7);
  const today = dateInZone(now, review.timeZone);
  if (today >= addDays(nextWeek, 7)) return null;
  return today > nextWeek ? today : nextWeek;
}
