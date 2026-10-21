import { parseDate } from './dates';

export type Priority = 'low' | 'normal' | 'high';
export type TaskInput = {
  goalId?: string | null;
  title: string;
  notes: string;
  dueDate: string | null;
  plannedDate: string | null;
  priority: Priority;
};
export type Task = TaskInput & {
  id: string;
  status: 'open' | 'completed';
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TaskFilter = 'open' | 'inbox' | 'completed' | 'archived';

export function validateTask(input: TaskInput): TaskInput {
  const title = input.title.trim();
  if (!title) throw new Error('Give your task a title.');
  if (title.length > 200)
    throw new Error('Keep the title under 201 characters.');
  if (input.notes.length > 5000)
    throw new Error('Keep notes under 5,001 characters.');
  if (!['low', 'normal', 'high'].includes(input.priority))
    throw new Error('Choose a valid priority.');
  if (input.plannedDate !== null) parseDate(input.plannedDate);
  if (input.dueDate !== null) parseDate(input.dueDate);
  return { ...input, title, notes: input.notes.trim() };
}

export function isOverdue(task: Task, today: string): boolean {
  return (
    !task.archivedAt &&
    task.status === 'open' &&
    !!task.dueDate &&
    task.dueDate < today
  );
}

export function todayTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter(
    (task) =>
      !task.archivedAt &&
      task.status === 'open' &&
      (task.plannedDate === today || isOverdue(task, today)),
  );
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((task) => {
    if (filter === 'archived') return !!task.archivedAt;
    if (task.archivedAt) return false;
    if (filter === 'completed') return task.status === 'completed';
    return (
      task.status === 'open' &&
      (filter !== 'inbox' || task.plannedDate === null)
    );
  });
}
