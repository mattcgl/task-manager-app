import { expect, test } from '@jest/globals';
import { addDays, localDate, parseDate, weekStart } from '../src/domain/dates';
import { filterTasks, todayTasks, type Task } from '../src/domain/tasks';

const task: Task = {
  id: '1',
  title: 'Learn',
  notes: '',
  plannedDate: '2026-10-20',
  dueDate: '2026-10-19',
  priority: 'normal',
  status: 'open',
  completedAt: null,
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
};

test('today includes planned and overdue once, excluding completed and archived', () => {
  const tasks = [
    task,
    { ...task, id: '2', status: 'completed' as const },
    { ...task, id: '3', archivedAt: '2026-10-20' },
    { ...task, id: '4', plannedDate: null, dueDate: '2026-10-20' },
  ];
  expect(todayTasks(tasks, '2026-10-20').map((row) => row.id)).toEqual(['1']);
  expect(todayTasks(tasks, '2026-10-21').map((row) => row.id)).toEqual([
    '1',
    '4',
  ]);
});

test('inbox includes deadline-only tasks while archive and completion filters are separate', () => {
  const tasks = [
    { ...task, plannedDate: null },
    { ...task, id: '2', status: 'completed' as const },
    {
      ...task,
      id: '3',
      archivedAt: '2026-10-20',
      status: 'completed' as const,
    },
  ];
  expect(filterTasks(tasks, 'inbox').map((row) => row.id)).toEqual(['1']);
  expect(filterTasks(tasks, 'completed').map((row) => row.id)).toEqual(['2']);
  expect(filterTasks(tasks, 'archived').map((row) => row.id)).toEqual(['3']);
});

test('calendar arithmetic crosses year, leap-day, and daylight-saving boundaries', () => {
  expect(parseDate('2026-03-07').getTimezoneOffset()).toBe(420);
  expect(parseDate('2026-03-09').getTimezoneOffset()).toBe(360);
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  expect(weekStart('2026-03-08')).toBe('2026-03-02');
  expect(weekStart('2026-03-09')).toBe('2026-03-09');
  expect(localDate(parseDate('2026-01-01'))).toBe('2026-01-01');
});

test.each(['2026-02-29', '2026-13-01', '2026-00-01', '2026-1-1', 'not a date'])(
  'rejects invalid date %s',
  (value) => {
    expect(() => parseDate(value)).toThrow();
  },
);
