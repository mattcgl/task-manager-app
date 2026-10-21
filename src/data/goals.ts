import { validateGoal, type Goal, type GoalInput } from '../domain/goals';
import type { TaskDatabase, TaskQueries } from './tasks';

export type GoalCommand =
  | { kind: 'create'; input: GoalInput }
  | { kind: 'edit'; id: string; input: GoalInput }
  | { kind: 'complete' | 'reopen' | 'archive' | 'restore'; id: string };
export function listGoals(db: TaskQueries): Promise<Goal[]> {
  return db.getAllAsync<Goal>(
    'SELECT * FROM goals ORDER BY createdAt DESC, id',
  );
}

export async function applyGoalCommand(
  db: TaskDatabase,
  command: GoalCommand,
  newId: () => string,
  now = new Date(),
) {
  const input = 'input' in command ? validateGoal(command.input) : undefined;
  const stamp = now.toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const previous =
      'id' in command
        ? await tx.getFirstAsync<Goal>(
            'SELECT * FROM goals WHERE id = ?',
            command.id,
          )
        : null;
    if (command.kind !== 'create' && !previous)
      throw new Error(
        'This goal is no longer available. Refresh and try again.',
      );
    if (previous?.archivedAt && !['restore', 'archive'].includes(command.kind))
      throw new Error('Restore this goal before changing it.');
    const goal: Goal = previous
      ? { ...previous, updatedAt: stamp }
      : {
          ...input!,
          id: newId(),
          status: 'active',
          archivedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
    if (command.kind === 'edit') Object.assign(goal, input);
    if (command.kind === 'complete') goal.status = 'completed';
    if (command.kind === 'reopen') goal.status = 'active';
    if (command.kind === 'archive') goal.archivedAt = goal.archivedAt ?? stamp;
    if (command.kind === 'restore') goal.archivedAt = null;
    await tx.runAsync(
      `INSERT INTO goals (id, title, description, targetDate, status, archivedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,
      description=excluded.description, targetDate=excluded.targetDate, status=excluded.status,
      archivedAt=excluded.archivedAt, updatedAt=excluded.updatedAt`,
      goal.id,
      goal.title,
      goal.description,
      goal.targetDate,
      goal.status,
      goal.archivedAt,
      goal.createdAt,
      goal.updatedAt,
    );
  });
}
