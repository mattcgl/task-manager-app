import { beforeEach, expect, jest, test } from '@jest/globals';
import { Alert } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ReviewPanel } from '../src/features/reviews/ReviewsScreen';
import { useTasks } from '../src/features/tasks/TaskProvider';
import { loadReview, type SaveReviewInput } from '../src/data/reviews';
import {
  buildReviewSnapshot,
  emptyReflection,
  type WeeklyReview,
} from '../src/domain/reviews';

jest.mock('../src/features/tasks/TaskProvider', () => ({
  useTasks: jest.fn(),
}));
jest.mock('../src/data/reviews', () => ({ loadReview: jest.fn() }));
jest.mock('expo-sqlite', () => {
  const db = {};
  return { useSQLiteContext: () => db };
});
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

const week = '2026-10-19';
const zone = 'America/Denver';
let review: WeeklyReview;
const saveWeeklyReview =
  jest.fn<(input: SaveReviewInput) => Promise<WeeklyReview>>();
beforeEach(() => {
  jest.restoreAllMocks();
  review = {
    id: null,
    weekStart: week,
    timeZone: zone,
    revision: 0,
    status: 'draft',
    reflection: emptyReflection(),
    snapshot: buildReviewSnapshot(
      [],
      week,
      zone,
      new Date('2026-10-21T12:00:00Z'),
    ),
  };
  jest.mocked(loadReview).mockReset().mockResolvedValue(review);
  saveWeeklyReview.mockReset().mockImplementation(async (input) => ({
    ...review,
    id: 'saved',
    revision: 1,
    reflection: input.reflection,
    status: input.finalize ? 'finalized' : review.status,
  }));
  jest.mocked(useTasks).mockReturnValue({
    tasks: [],
    goals: [],
    loading: false,
    busy: false,
    error: '',
    refresh: async () => {},
    execute: async () => {},
    executeGoal: async () => {},
    saveWeeklyReview,
  });
});

test('reflection and next-week priorities are saved as a draft', async () => {
  const dirty = jest.fn();
  render(<ReviewPanel week={week} zone={zone} onDirty={dirty} />);
  const field = await screen.findByLabelText('What went well?');
  fireEvent.changeText(field, 'Finished the first chapter');
  fireEvent.changeText(
    screen.getByLabelText('Next week’s priorities'),
    'Practice daily',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(saveWeeklyReview).toHaveBeenCalledWith(
      expect.objectContaining({
        finalize: false,
        expectedRevision: 0,
        reflection: expect.objectContaining({
          accomplishments: 'Finished the first chapter',
          priorities: 'Practice daily',
        }),
      }),
    ),
  );
  expect(
    await screen.findByText('Draft saved. You can return to it later.'),
  ).toBeTruthy();
  expect(dirty).toHaveBeenLastCalledWith(false);
});

test('failed save preserves typed reflections', async () => {
  saveWeeklyReview.mockRejectedValueOnce(
    new Error('Could not save this review.'),
  );
  render(<ReviewPanel week={week} zone={zone} onDirty={() => {}} />);
  fireEvent.changeText(
    await screen.findByLabelText('What got in the way?'),
    'Too many commitments',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByText('Could not save this review.')).toBeTruthy();
  expect(screen.getByDisplayValue('Too many commitments')).toBeTruthy();
});

test('finalizing requires confirmation and changes available controls', async () => {
  const confirm = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Finalize')?.onPress?.();
    });
  render(<ReviewPanel week={week} zone={zone} onDirty={() => {}} />);
  fireEvent.press(
    await screen.findByRole('button', { name: 'Finalize review' }),
  );
  expect(confirm.mock.calls[0][1]).toContain('still in progress');
  await screen.findByRole('button', { name: 'Save reflection changes' });
  expect(screen.queryByRole('button', { name: 'Refresh summary' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Finalize review' })).toBeNull();
});

test('summary refresh preserves unsaved text', async () => {
  render(<ReviewPanel week={week} zone={zone} onDirty={() => {}} />);
  fireEvent.changeText(
    await screen.findByLabelText('What will you change?'),
    'Keep this unsaved thought',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Refresh summary' }));
  await screen.findByText(
    'Summary refreshed. Your reflection text is unchanged.',
  );
  expect(screen.getByDisplayValue('Keep this unsaved thought')).toBeTruthy();
  expect(saveWeeklyReview).not.toHaveBeenCalled();
});
