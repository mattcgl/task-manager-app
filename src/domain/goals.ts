import { parseDate } from './dates';
import type { Task } from './tasks';

export type GoalInput = {
  title: string;
  description: string;
  targetDate: string | null;
};
export type Goal = GoalInput & {
  id: string;
  status: 'active' | 'completed';
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function validateGoal(input: GoalInput): GoalInput {
  const title = input.title.trim();
  if (!title) throw new Error('Give your goal a title.');
  if (title.length > 200)
    throw new Error('Keep the goal title under 201 characters.');
  if (input.description.length > 5000)
    throw new Error('Keep the description under 5,001 characters.');
  if (input.targetDate !== null) parseDate(input.targetDate);
  return { ...input, title, description: input.description.trim() };
}

export function goalProgress(goalId: string, tasks: Task[]) {
  const linked = tasks.filter(
    (task) => task.goalId === goalId && !task.archivedAt,
  );
  const completed = linked.filter((task) => task.status === 'completed').length;
  return {
    total: linked.length,
    completed,
    percent: linked.length
      ? Math.round((completed / linked.length) * 100)
      : null,
  };
}
