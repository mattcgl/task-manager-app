import { beforeEach, expect, jest, test } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { TaskEditor } from '../src/features/tasks/TaskEditor';
import { useTasks } from '../src/features/tasks/TaskProvider';
import type { TaskCommand } from '../src/data/tasks';
import type { Task } from '../src/domain/tasks';
import { GoalsScreen } from '../src/features/goals/GoalsScreen';
import type { Goal } from '../src/domain/goals';
import type { GoalCommand } from '../src/data/goals';

jest.mock('../src/features/tasks/TaskProvider', () => ({
  useTasks: jest.fn(),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>(
      'react-native-safe-area-context/jest/mock',
    ).default,
);

const execute = jest.fn<(command: TaskCommand) => Promise<void>>();
beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue(undefined);
  jest.mocked(useTasks).mockReturnValue({
    tasks: [],
    goals: [],
    executeGoal: async () => {},
    saveWeeklyReview: async () => {
      throw new Error('Not used in this test');
    },
    loading: false,
    busy: false,
    error: '',
    refresh: async () => {},
    execute,
  });
});

test('new task form sends title, notes, priority, and the chosen planned date', async () => {
  const close = jest.fn();
  render(<TaskEditor task={null} plannedDate="2026-10-20" onClose={close} />);
  fireEvent.changeText(screen.getByLabelText('Task title'), 'Read chapter 3');
  fireEvent.changeText(
    screen.getByLabelText('Task notes'),
    'Focus on examples',
  );
  fireEvent.press(screen.getByRole('button', { name: 'High' }));
  fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(execute).toHaveBeenCalledWith({
    kind: 'create',
    input: {
      title: 'Read chapter 3',
      goalId: null,
      notes: 'Focus on examples',
      priority: 'high',
      dueDate: null,
      plannedDate: '2026-10-20',
    },
  });
});

test('a failed save keeps the typed task visible and does not dismiss the form', async () => {
  execute.mockRejectedValueOnce(new Error('Could not save. Please try again.'));
  const close = jest.fn();
  render(<TaskEditor task={null} plannedDate={null} onClose={close} />);
  fireEvent.changeText(screen.getByLabelText('Task title'), 'Keep this draft');
  fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
  expect(
    await screen.findByText('Could not save. Please try again.'),
  ).toBeTruthy();
  expect(screen.getByDisplayValue('Keep this draft')).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
});

test('editing preserves identity and can clear a planned date without clearing the deadline', async () => {
  const task: Task = {
    id: 'existing',
    title: 'Original',
    notes: '',
    dueDate: '2026-10-25',
    plannedDate: '2026-10-20',
    priority: 'low',
    status: 'open',
    completedAt: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
  };
  render(<TaskEditor task={task} plannedDate={null} onClose={() => {}} />);
  fireEvent.changeText(screen.getByLabelText('Task title'), 'Updated');
  fireEvent.press(screen.getByRole('button', { name: 'Clear planned date' }));
  fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
  await waitFor(() =>
    expect(execute).toHaveBeenCalledWith({
      kind: 'edit',
      id: 'existing',
      input: {
        title: 'Updated',
        goalId: null,
        notes: '',
        priority: 'low',
        plannedDate: null,
        dueDate: '2026-10-25',
      },
    }),
  );
});

const goal: Goal = {
  id: 'goal-1',
  title: 'Learn SQL',
  description: '',
  targetDate: null,
  status: 'active',
  archivedAt: null,
  createdAt: '',
  updatedAt: '',
};

test('task editor links a selected goal', async () => {
  jest.mocked(useTasks).mockReturnValue({ ...useTasks(), goals: [goal] });
  render(<TaskEditor task={null} plannedDate={null} onClose={() => {}} />);
  fireEvent.changeText(screen.getByLabelText('Task title'), 'Practice joins');
  fireEvent.press(screen.getByRole('button', { name: 'Learn SQL' }));
  fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
  await waitFor(() =>
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ goalId: goal.id }),
      }),
    ),
  );
});

test('goal screen shows empty progress and permits creating a goal', async () => {
  const executeGoal = jest
    .fn<(command: GoalCommand) => Promise<void>>()
    .mockResolvedValue(undefined);
  jest
    .mocked(useTasks)
    .mockReturnValue({ ...useTasks(), goals: [goal], executeGoal });
  render(<GoalsScreen />);
  expect(
    screen.getByText(
      'No task progress yet. Link a task to start measuring your steps.',
    ),
  ).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Create a goal' }));
  fireEvent.changeText(screen.getByLabelText('Goal title'), 'Read more books');
  fireEvent.press(screen.getByRole('button', { name: 'Save goal' }));
  await waitFor(() =>
    expect(executeGoal).toHaveBeenCalledWith({
      kind: 'create',
      input: { title: 'Read more books', description: '', targetDate: null },
    }),
  );
});
