import type { Task, TaskInput } from '../domain/tasks';
import { validateTask } from '../domain/tasks';
import { localDate, weekStart, parseDate } from '../domain/dates';
import type { Goal } from '../domain/goals';

type Value = string | number | null;
export interface TaskQueries {
  runAsync(sql: string, ...values: Value[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...values: Value[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...values: Value[]): Promise<T[]>;
}
export interface TaskDatabase extends TaskQueries {
  withExclusiveTransactionAsync(
    work: (transaction: TaskQueries) => Promise<void>,
  ): Promise<void>;
}

export type TaskCommand =
  | { kind: 'plan'; id: string; plannedDate: string }
  | { kind: 'create'; input: TaskInput }
  | { kind: 'edit'; id: string; input: TaskInput }
  | { kind: 'complete' | 'reopen' | 'archive' | 'restore'; id: string };

export function listTasks(db: TaskQueries): Promise<Task[]> {
  return db.getAllAsync<Task>(`SELECT * FROM tasks ORDER BY
    CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
    COALESCE(dueDate, '9999-12-31'), createdAt DESC, id`);
}

// The clock and ID generator are inputs so tests exercise the same repository.
export async function applyTaskCommand(
  db: TaskDatabase,
  command: TaskCommand,
  newId: () => string,
  now = new Date(),
): Promise<void> {
  const stamp = now.toISOString();
  const input = 'input' in command ? validateTask(command.input) : undefined;
  if (command.kind === 'plan') parseDate(command.plannedDate);
  await db.withExclusiveTransactionAsync(async (tx) => {
    const previous =
      'id' in command
        ? await tx.getFirstAsync<Task>(
            'SELECT * FROM tasks WHERE id = ?',
            command.id,
          )
        : null;
    if (command.kind !== 'create' && !previous)
      throw new Error('This task is no longer available. Refresh the list.');
    if (previous?.archivedAt && !['restore', 'archive'].includes(command.kind))
      throw new Error('Restore this task before changing it.');
    const task: Task = previous
      ? { ...previous, updatedAt: stamp }
      : {
          ...input!,
          id: newId(),
          status: 'open',
          completedAt: null,
          archivedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
    if (command.kind === 'edit') Object.assign(task, input);
    if (command.kind === 'plan') {
      if (task.status !== 'open')
        throw new Error('Only unfinished tasks can be planned.');
      task.plannedDate = command.plannedDate;
    }
    task.goalId = task.goalId ?? null;
    if (task.goalId) {
      const goal = await tx.getFirstAsync<Goal>(
        'SELECT * FROM goals WHERE id = ?',
        task.goalId,
      );
      if (!goal || (goal.archivedAt && task.goalId !== previous?.goalId))
        throw new Error('Choose an available goal or select No goal.');
    }
    if (command.kind === 'complete') {
      if (task.status === 'completed') return;
      task.status = 'completed';
      task.completedAt = stamp;
    }
    if (command.kind === 'reopen') {
      if (task.status === 'open') return;
      task.status = 'open';
      task.completedAt = null;
    }
    if (command.kind === 'archive') {
      if (task.archivedAt) return;
      task.archivedAt = stamp;
    }
    if (command.kind === 'restore') {
      if (!task.archivedAt) return;
      task.archivedAt = null;
    }

    await tx.runAsync(
      `INSERT INTO tasks
      (id, title, notes, dueDate, plannedDate, priority, status, completedAt, archivedAt, createdAt, updatedAt, goalId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, notes=excluded.notes,
      dueDate=excluded.dueDate, plannedDate=excluded.plannedDate, priority=excluded.priority,
      status=excluded.status, completedAt=excluded.completedAt, archivedAt=excluded.archivedAt, updatedAt=excluded.updatedAt, goalId=excluded.goalId`,
      task.id,
      task.title,
      task.notes,
      task.dueDate,
      task.plannedDate,
      task.priority,
      task.status,
      task.completedAt,
      task.archivedAt,
      task.createdAt,
      task.updatedAt,
      task.goalId,
    );

    if (
      command.kind === 'edit' &&
      previous?.plannedDate &&
      task.plannedDate === null
    ) {
      await tx.runAsync(
        'UPDATE weekly_commitments SET withdrawnAt = ? WHERE taskId = ? AND weekStart = ?',
        stamp,
        task.id,
        weekStart(previous.plannedDate),
      );
    }
    if (
      task.plannedDate &&
      (command.kind === 'create' ||
        command.kind === 'plan' ||
        command.kind === 'edit' ||
        command.kind === 'restore')
    ) {
      await tx.runAsync(
        `INSERT INTO weekly_commitments (id, taskId, weekStart, createdAt, withdrawnAt)
        VALUES (?, ?, ?, ?, NULL) ON CONFLICT(taskId, weekStart) DO UPDATE SET withdrawnAt = NULL`,
        newId(),
        task.id,
        weekStart(task.plannedDate),
        stamp,
      );
    }
    const commitments = await tx.getAllAsync(
      'SELECT weekStart, withdrawnAt FROM weekly_commitments WHERE taskId = ? ORDER BY weekStart',
      task.id,
    );
    await tx.runAsync(
      `INSERT INTO task_events (id, taskId, kind, occurredAt, localDate, timeZone, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      task.id,
      command.kind,
      stamp,
      localDate(now),
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      JSON.stringify({ task, commitments }),
    );
  });
}
