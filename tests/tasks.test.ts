/** @jest-environment node */
import { afterEach, beforeEach, expect, test } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../src/data/migrations';
import {
  applyTaskCommand,
  listTasks,
  type TaskDatabase,
} from '../src/data/tasks';
import type { Task, TaskInput } from '../src/domain/tasks';
import { applyGoalCommand, listGoals } from '../src/data/goals';
import { goalProgress, validateGoal } from '../src/domain/goals';

let db: DatabaseSync;
let connection: TaskDatabase;
let sequence = 0;
const id = () => `test-${++sequence}`;
const now = () =>
  new Date(`2026-10-20T12:00:${String(sequence % 60).padStart(2, '0')}.000Z`);
const input: TaskInput = {
  title: "Read a chapter's notes",
  notes: '',
  dueDate: null,
  plannedDate: '2026-10-20',
  priority: 'normal',
};

beforeEach(async () => {
  sequence = 0;
  db = new DatabaseSync(':memory:');
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
  connection = {
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
      await connection.withExclusiveTransactionAsync(async () => work());
    },
  });
});
afterEach(() => db.close());

async function create(overrides: Partial<TaskInput> = {}): Promise<Task> {
  await applyTaskCommand(
    connection,
    { kind: 'create', input: { ...input, ...overrides } },
    id,
    now(),
  );
  return (await listTasks(connection))[0];
}

test('creation saves validated fields, commitment, and complete historical snapshot', async () => {
  const task = await create({ title: '  Learn SQL  ', priority: 'high' });
  expect(task.title).toBe('Learn SQL');
  expect(task.status).toBe('open');
  expect(
    db.prepare('SELECT weekStart FROM weekly_commitments').get()?.weekStart,
  ).toBe('2026-10-19');
  const event = db.prepare('SELECT * FROM task_events').get()!;
  expect(event.kind).toBe('create');
  expect(JSON.parse(event.snapshot as string).task.id).toBe(task.id);
});

test('completion, duplicate completion, reopening, archive and restore preserve history', async () => {
  const task = await create();
  for (const kind of ['complete', 'complete', 'reopen', 'archive'] as const)
    await applyTaskCommand(connection, { kind, id: task.id }, id, now());
  expect((await listTasks(connection))[0].archivedAt).not.toBeNull();
  await expect(
    applyTaskCommand(connection, { kind: 'edit', id: task.id, input }, id),
  ).rejects.toThrow('Restore');
  await applyTaskCommand(
    connection,
    { kind: 'restore', id: task.id },
    id,
    now(),
  );
  const restored = (await listTasks(connection))[0];
  expect(restored.status).toBe('open');
  expect(restored.completedAt).toBeNull();
  expect(restored.archivedAt).toBeNull();
  expect(
    db
      .prepare('SELECT kind FROM task_events ORDER BY rowid')
      .all()
      .map((event) => event.kind),
  ).toEqual(['create', 'complete', 'reopen', 'archive', 'restore']);
});

test('rescheduling retains the original week; same-week edits do not duplicate commitments', async () => {
  const task = await create();
  for (const plannedDate of ['2026-10-21', '2026-10-27'])
    await applyTaskCommand(
      connection,
      { kind: 'edit', id: task.id, input: { ...input, plannedDate } },
      id,
      now(),
    );
  expect(
    db
      .prepare('SELECT weekStart FROM weekly_commitments ORDER BY weekStart')
      .all()
      .map((row) => row.weekStart),
  ).toEqual(['2026-10-19', '2026-10-26']);
  await applyTaskCommand(
    connection,
    { kind: 'edit', id: task.id, input: { ...input, plannedDate: null } },
    id,
    now(),
  );
  expect(
    db
      .prepare(
        "SELECT withdrawnAt FROM weekly_commitments WHERE weekStart = '2026-10-26'",
      )
      .get()?.withdrawnAt,
  ).not.toBeNull();
  expect(
    db
      .prepare(
        "SELECT withdrawnAt FROM weekly_commitments WHERE weekStart = '2026-10-19'",
      )
      .get()?.withdrawnAt,
  ).toBeNull();
  await applyTaskCommand(
    connection,
    {
      kind: 'edit',
      id: task.id,
      input: { ...input, plannedDate: '2026-10-27' },
    },
    id,
    now(),
  );
  expect(
    db
      .prepare(
        "SELECT withdrawnAt FROM weekly_commitments WHERE weekStart = '2026-10-26'",
      )
      .get()?.withdrawnAt,
  ).toBeNull();
});

test('backlog and deadline-only tasks do not invent weekly commitments', async () => {
  await create({ plannedDate: null, dueDate: '2026-10-20' });
  expect(db.prepare('SELECT * FROM weekly_commitments').all()).toHaveLength(0);
});

test('failure writing history rolls back task and commitment creation', async () => {
  db.exec(
    "CREATE TRIGGER fail_history BEFORE INSERT ON task_events BEGIN SELECT RAISE(ABORT, 'disk failure'); END;",
  );
  await expect(create()).rejects.toThrow('disk failure');
  expect(await listTasks(connection)).toHaveLength(0);
  expect(db.prepare('SELECT * FROM weekly_commitments').all()).toHaveLength(0);
});

test('failure during an edit leaves task and prior commitment unchanged', async () => {
  const task = await create();
  db.exec(
    "CREATE TRIGGER fail_history BEFORE INSERT ON task_events BEGIN SELECT RAISE(ABORT, 'disk failure'); END;",
  );
  await expect(
    applyTaskCommand(
      connection,
      {
        kind: 'edit',
        id: task.id,
        input: { ...input, title: 'Changed', plannedDate: '2026-11-03' },
      },
      id,
    ),
  ).rejects.toThrow();
  expect((await listTasks(connection))[0]).toEqual(task);
  expect(db.prepare('SELECT * FROM weekly_commitments').all()).toHaveLength(1);
});

test('invalid task and impossible dates make no writes', async () => {
  await expect(create({ title: '   ' })).rejects.toThrow('title');
  await expect(create({ dueDate: '2026-02-30' })).rejects.toThrow(
    'calendar date',
  );
  expect(await listTasks(connection)).toHaveLength(0);
  expect(db.prepare('SELECT * FROM task_events').all()).toHaveLength(0);
});

async function createGoal(title = 'Learn databases') {
  await applyGoalCommand(
    connection,
    {
      kind: 'create',
      input: {
        title,
        description: 'Practice each week',
        targetDate: '2026-12-31',
      },
    },
    id,
    now(),
  );
  return (await listGoals(connection)).find((goal) => goal.title === title)!;
}

test('empty goals show no percentage and completion stays an explicit action', async () => {
  const goal = await createGoal();
  expect(goalProgress(goal.id, await listTasks(connection))).toEqual({
    total: 0,
    completed: 0,
    percent: null,
  });
  const task = await create({ goalId: goal.id });
  await applyTaskCommand(
    connection,
    { kind: 'complete', id: task.id },
    id,
    now(),
  );
  expect(goalProgress(goal.id, await listTasks(connection))).toEqual({
    total: 1,
    completed: 1,
    percent: 100,
  });
  expect((await listGoals(connection))[0].status).toBe('active');
  await applyGoalCommand(
    connection,
    { kind: 'complete', id: goal.id },
    id,
    now(),
  );
  expect((await listGoals(connection))[0].status).toBe('completed');
  await applyTaskCommand(
    connection,
    { kind: 'reopen', id: task.id },
    id,
    now(),
  );
  expect(goalProgress(goal.id, await listTasks(connection)).percent).toBe(0);
  expect((await listGoals(connection))[0].status).toBe('completed');
});

test('archiving goals preserves tasks and restoration preserves completion status', async () => {
  const goal = await createGoal();
  const task = await create({ goalId: goal.id });
  await applyGoalCommand(
    connection,
    { kind: 'complete', id: goal.id },
    id,
    now(),
  );
  await applyGoalCommand(
    connection,
    { kind: 'archive', id: goal.id },
    id,
    now(),
  );
  expect((await listTasks(connection))[0]).toEqual(task);
  await expect(create({ goalId: goal.id })).rejects.toThrow('available goal');
  // Existing links to an archived goal remain usable.
  await applyTaskCommand(
    connection,
    {
      kind: 'edit',
      id: task.id,
      input: { ...input, title: 'Updated', goalId: goal.id },
    },
    id,
    now(),
  );
  await applyGoalCommand(
    connection,
    { kind: 'restore', id: goal.id },
    id,
    now(),
  );
  expect((await listGoals(connection))[0].status).toBe('completed');
  expect((await listGoals(connection))[0].archivedAt).toBeNull();
  await applyGoalCommand(
    connection,
    { kind: 'reopen', id: goal.id },
    id,
    now(),
  );
  expect((await listGoals(connection))[0].status).toBe('active');
});

test('changing a task goal moves progress and archived tasks do not count', async () => {
  const first = await createGoal('First');
  const second = await createGoal('Second');
  const task = await create({ goalId: first.id });
  await applyTaskCommand(
    connection,
    { kind: 'edit', id: task.id, input: { ...input, goalId: second.id } },
    id,
    now(),
  );
  expect(goalProgress(first.id, await listTasks(connection)).total).toBe(0);
  expect(goalProgress(second.id, await listTasks(connection)).total).toBe(1);
  const events = db
    .prepare(
      'SELECT snapshot FROM task_events WHERE taskId = ? ORDER BY sequence',
    )
    .all(task.id);
  expect(JSON.parse(events[0].snapshot as string).task.goalId).toBe(first.id);
  await applyTaskCommand(
    connection,
    { kind: 'archive', id: task.id },
    id,
    now(),
  );
  expect(
    goalProgress(second.id, await listTasks(connection)).percent,
  ).toBeNull();
  await applyTaskCommand(
    connection,
    { kind: 'restore', id: task.id },
    id,
    now(),
  );
  await applyTaskCommand(
    connection,
    { kind: 'edit', id: task.id, input: { ...input, goalId: null } },
    id,
    now(),
  );
  expect(goalProgress(second.id, await listTasks(connection)).total).toBe(0);
});

test('unknown goal assignment rejects the entire task write', async () => {
  await expect(create({ goalId: 'missing' })).rejects.toThrow('available goal');
  expect(await listTasks(connection)).toHaveLength(0);
  expect(db.prepare('SELECT * FROM task_events').all()).toHaveLength(0);
});

test('goal edits validate titles and dates without losing saved values', async () => {
  const goal = await createGoal();
  await expect(
    applyGoalCommand(
      connection,
      {
        kind: 'edit',
        id: goal.id,
        input: { title: '  ', description: '', targetDate: null },
      },
      id,
    ),
  ).rejects.toThrow('title');
  expect((await listGoals(connection))[0]).toEqual(goal);
  expect(() =>
    validateGoal({
      title: 'Good title',
      description: '',
      targetDate: '2026-02-30',
    }),
  ).toThrow();
  await applyGoalCommand(
    connection,
    {
      kind: 'edit',
      id: goal.id,
      input: { title: 'Renamed', description: 'Updated', targetDate: null },
    },
    id,
  );
  expect((await listGoals(connection))[0].title).toBe('Renamed');
  expect((await listGoals(connection))[0].targetDate).toBeNull();
});
