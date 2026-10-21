/** @jest-environment node */
import { afterEach, beforeEach, expect, test } from '@jest/globals';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { testDatabase } from './support/database';
import {
  applyTaskCommand,
  listTasks,
  type TaskCommand,
} from '../src/data/tasks';
import { loadReview, saveReview } from '../src/data/reviews';
import {
  emptyReflection,
  followingWeekPlanDate,
  startOfDateInZone,
} from '../src/domain/reviews';

let fixture: Awaited<ReturnType<typeof testDatabase>>;
let counter = 0;
const id = () => `review-test-${++counter}`;
const zone = 'America/Denver';
const week = '2026-10-19';
const cutoff = new Date('2026-10-26T12:00:00Z');
beforeEach(async () => {
  fixture = await testDatabase();
  counter = 0;
});
afterEach(() => fixture.db.close());
async function command(value: TaskCommand, at = '2026-10-20T12:00:00Z') {
  await applyTaskCommand(fixture.api, value, id, new Date(at));
}
async function create(
  title: string,
  plannedDate: string | null = '2026-10-20',
  at = '2026-10-20T12:00:00Z',
) {
  await command(
    {
      kind: 'create',
      input: {
        title,
        notes: '',
        plannedDate,
        dueDate: null,
        priority: 'normal',
      },
    },
    at,
  );
  return (await listTasks(fixture.api)).find((task) => task.title === title)!;
}
const review = (now = cutoff) => loadReview(fixture.api, week, zone, now);
const save = (finalize: boolean, expectedRevision = 0, now = cutoff) =>
  saveReview(
    fixture.api,
    {
      weekStart: week,
      timeZone: zone,
      reflection: emptyReflection(),
      finalize,
      expectedRevision,
    },
    id,
    now,
  );

test('counts unplanned completed work and unfinished commitments, excluding untouched backlog', async () => {
  const done = await create('Unplanned win', null);
  await create('My commitment');
  await create('Backlog', null);
  await command({ kind: 'complete', id: done.id });
  const { snapshot } = await review();
  expect(snapshot.accomplishments.map((task) => task.title)).toEqual([
    'Unplanned win',
  ]);
  expect(snapshot.accomplishments[0].committed).toBe(false);
  expect(snapshot.unfinished.map((task) => task.title)).toEqual([
    'My commitment',
  ]);
  expect(snapshot.commitmentCount).toBe(1);
});

test('moving a task to next week preserves its unfinished original commitment', async () => {
  const task = await create('Move me');
  await command({ kind: 'plan', id: task.id, plannedDate: '2026-10-27' });
  expect((await review()).snapshot.unfinished).toHaveLength(1);
  expect(
    fixture.db.prepare('SELECT * FROM weekly_commitments').all(),
  ).toHaveLength(2);
});

test('reopened tasks count as unfinished and duplicate completions count once', async () => {
  const task = await create('Try again');
  await command({ kind: 'complete', id: task.id });
  await command({ kind: 'complete', id: task.id });
  expect((await review()).snapshot.accomplishments).toHaveLength(1);
  await command({ kind: 'reopen', id: task.id });
  expect((await review()).snapshot.accomplishments).toHaveLength(0);
  expect((await review()).snapshot.unfinished).toHaveLength(1);
});

test('post-week reopen and rename do not rewrite state at the cutoff', async () => {
  const task = await create('Original title');
  await command({ kind: 'complete', id: task.id }, '2026-10-25T12:00:00Z');
  await command({ kind: 'reopen', id: task.id }, '2026-10-26T07:00:00Z');
  await command(
    { kind: 'edit', id: task.id, input: { ...task, title: 'Later title' } },
    '2026-10-26T08:00:00Z',
  );
  expect((await review()).snapshot.accomplishments[0].title).toBe(
    'Original title',
  );
});

test('archived and withdrawn commitments are separate from unfinished work', async () => {
  const archived = await create('Archived');
  const withdrawn = await create('Withdrawn');
  await command({ kind: 'archive', id: archived.id });
  await command({
    kind: 'edit',
    id: withdrawn.id,
    input: { ...withdrawn, plannedDate: null },
  });
  const { snapshot } = await review();
  expect(snapshot.unfinished).toHaveLength(0);
  expect(snapshot.setAside.map((task) => task.reason)).toEqual([
    'archived',
    'withdrawn',
  ]);
});

test('completed-before-week commitments are labeled rather than counted as new accomplishments', async () => {
  const task = await create(
    'Already done',
    '2026-10-20',
    '2026-10-18T12:00:00Z',
  );
  await command({ kind: 'complete', id: task.id }, '2026-10-18T13:00:00Z');
  const { snapshot } = await review();
  expect(snapshot.alreadyComplete).toHaveLength(1);
  expect(snapshot.accomplishments).toHaveLength(0);
});

test('Monday midnight belongs to the next week', async () => {
  const task = await create('Boundary');
  await command({ kind: 'complete', id: task.id }, '2026-10-26T06:00:00.000Z');
  expect((await review()).snapshot.unfinished).toHaveLength(1);
  expect(
    (await loadReview(fixture.api, '2026-10-26', zone, cutoff)).snapshot
      .accomplishments,
  ).toHaveLength(1);
});

test('week boundaries account for spring and fall daylight saving', () => {
  const hours = (from: string, to: string) =>
    (startOfDateInZone(to, zone).getTime() -
      startOfDateInZone(from, zone).getTime()) /
    3_600_000;
  expect(hours('2026-03-02', '2026-03-09')).toBe(167);
  expect(hours('2026-10-26', '2026-11-02')).toBe(169);
  expect(startOfDateInZone('2026-10-19', 'Asia/Kolkata').toISOString()).toBe(
    '2026-10-18T18:30:00.000Z',
  );
});

test('saved draft retains its zone across travel and refreshes its summary', async () => {
  await save(false, 0, new Date('2026-10-21T12:00:00Z'));
  const task = await create('After draft');
  await command({ kind: 'complete', id: task.id }, '2026-10-22T12:00:00Z');
  const loaded = await loadReview(fixture.api, week, 'Asia/Tokyo', cutoff);
  expect(loaded.timeZone).toBe(zone);
  expect(loaded.snapshot.accomplishments).toHaveLength(1);
});

test('finalized metrics survive task changes and reflection edits; SQL trigger protects them', async () => {
  const task = await create('Freeze this');
  const finalized = await save(true, 0, new Date('2026-10-21T12:00:00Z'));
  await command({ kind: 'complete', id: task.id }, '2026-10-22T12:00:00Z');
  const updated = await saveReview(
    fixture.api,
    {
      weekStart: week,
      timeZone: 'Asia/Tokyo',
      reflection: { ...emptyReflection(), changes: 'Try smaller steps' },
      finalize: false,
      expectedRevision: finalized.revision,
    },
    id,
    cutoff,
  );
  expect(updated.status).toBe('finalized');
  expect(updated.snapshot).toEqual(finalized.snapshot);
  expect(updated.reflection.changes).toBe('Try smaller steps');
  expect((await review()).snapshot).toEqual(finalized.snapshot);
  expect(() =>
    fixture.db.prepare('UPDATE weekly_reviews SET snapshot = ?').run('{}'),
  ).toThrow('cannot be changed');
});

test('stale saves are rejected and only one review per week is stored', async () => {
  await save(false);
  await expect(save(false)).rejects.toThrow('changed since');
  await save(true, 1);
  expect(fixture.db.prepare('SELECT * FROM weekly_reviews').all()).toHaveLength(
    1,
  );
});

test('save failure and invalid input leave review storage untouched', async () => {
  await expect(
    saveReview(
      fixture.api,
      {
        weekStart: '2026-12-07',
        timeZone: zone,
        reflection: emptyReflection(),
        finalize: false,
        expectedRevision: 0,
      },
      id,
      cutoff,
    ),
  ).rejects.toThrow('Future');
  await expect(
    saveReview(
      fixture.api,
      {
        weekStart: week,
        timeZone: zone,
        reflection: { ...emptyReflection(), priorities: 'x'.repeat(5001) },
        finalize: false,
        expectedRevision: 0,
      },
      id,
      cutoff,
    ),
  ).rejects.toThrow('5,001');
  fixture.db.exec(
    "CREATE TRIGGER fail_review BEFORE INSERT ON weekly_reviews BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
  );
  await expect(save(false)).rejects.toThrow('disk full');
  expect(fixture.db.prepare('SELECT * FROM weekly_reviews').all()).toHaveLength(
    0,
  );
});

test('planning is opt-in, preserves task details, and does not change a finalized review', async () => {
  const task = await create('Carry by choice');
  const saved = await save(true, 0, new Date('2026-10-23T12:00:00Z'));
  expect((await listTasks(fixture.api))[0].plannedDate).toBe('2026-10-20');
  const target = followingWeekPlanDate(
    saved.snapshot,
    new Date('2026-10-23T12:00:00Z'),
  )!;
  expect(target).toBe('2026-10-26');
  await command(
    { kind: 'plan', id: task.id, plannedDate: target },
    '2026-10-23T13:00:00Z',
  );
  expect((await listTasks(fixture.api))[0].title).toBe(task.title);
  expect((await review()).snapshot).toEqual(saved.snapshot);
  expect(
    followingWeekPlanDate(saved.snapshot, new Date('2026-10-28T12:00:00Z')),
  ).toBe('2026-10-28');
  expect(
    followingWeekPlanDate(saved.snapshot, new Date('2026-11-02T12:00:00Z')),
  ).toBeNull();
});

test('saved review and reflection survive closing and reopening SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'review-persistence-'));
  const path = join(directory, 'test.db');
  let file = await testDatabase(path);
  try {
    const saved = await saveReview(
      file.api,
      {
        weekStart: week,
        timeZone: zone,
        reflection: {
          ...emptyReflection(),
          accomplishments: 'Kept showing up',
        },
        finalize: true,
        expectedRevision: 0,
      },
      id,
      cutoff,
    );
    file.db.close();
    file = await testDatabase(path);
    expect(await loadReview(file.api, week, 'UTC', cutoff)).toEqual(saved);
  } finally {
    file.db.close();
    unlinkSync(path);
    rmdirSync(directory);
  }
});
