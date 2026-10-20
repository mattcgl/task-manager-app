import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { styles } from '../../components/Screen';
import { displayDate } from '../../domain/dates';
import {
  filterTasks,
  isOverdue,
  todayTasks,
  type Task,
  type TaskFilter,
} from '../../domain/tasks';
import type { TaskCommand } from '../../data/tasks';
import { theme } from '../../theme';
import { useTasks } from './TaskProvider';
import { TaskEditor, SmallButton, formStyles } from './TaskEditor';
import { useToday } from './useToday';

const filters: { key: TaskFilter; title: string }[] = [
  { key: 'open', title: 'Open' },
  { key: 'inbox', title: 'Inbox' },
  { key: 'completed', title: 'Completed' },
  { key: 'archived', title: 'Archived' },
];

export function TaskWorkspace({ mode }: { mode: 'today' | 'all' }) {
  const { tasks, loading, busy, error, refresh, execute } = useTasks();
  const today = useToday();
  const [filter, setFilter] = useState<TaskFilter>('open');
  const [quickTitle, setQuickTitle] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<Task | null | undefined>(undefined);
  const visible =
    mode === 'today' ? todayTasks(tasks, today) : filterTasks(tasks, filter);

  async function run(command: TaskCommand, success: string) {
    setActionError('');
    setMessage('');
    try {
      await execute(command);
      setMessage(success);
      return true;
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : 'Could not update the task. Try again.',
      );
      return false;
    }
  }
  async function quickAdd() {
    if (
      await run(
        {
          kind: 'create',
          input: {
            title: quickTitle,
            notes: '',
            priority: 'normal',
            dueDate: null,
            plannedDate: mode === 'today' ? today : null,
          },
        },
        mode === 'today'
          ? 'Task planned for today.'
          : 'Task added to your inbox.',
      )
    )
      setQuickTitle('');
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.heading}>Add a small step</Text>
        <TextInput
          accessibilityLabel="Quick task title"
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder="What is your next step?"
          placeholderTextColor={theme.colors.muted}
          style={formStyles.input}
          maxLength={200}
          editable={!busy && !loading && !error}
          onSubmitEditing={quickAdd}
          returnKeyType="done"
        />
        <View style={formStyles.row}>
          <SmallButton
            label={mode === 'today' ? 'Add to today' : 'Add to inbox'}
            disabled={busy || loading || !!error}
            onPress={quickAdd}
            selected
          />
          <SmallButton
            label="Add with details"
            disabled={busy || loading || !!error}
            onPress={() => setEditor(null)}
          />
        </View>
      </View>
      {!!actionError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {actionError}
        </Text>
      )}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {message}
        </Text>
      )}
      {!!error && (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <SmallButton
            label="Refresh tasks"
            onPress={() => void refresh()}
            disabled={busy}
          />
        </View>
      )}
      {mode === 'all' && (
        <View style={formStyles.row}>
          {filters.map(({ key, title }) => (
            <SmallButton
              key={key}
              label={title}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </View>
      )}
      <Text accessibilityRole="header" style={styles.heading}>
        {mode === 'today'
          ? `Today & overdue · ${visible.length}`
          : `${filters.find((item) => item.key === filter)?.title} · ${visible.length}`}
      </Text>
      {mode === 'all' && filter === 'inbox' && (
        <Text style={styles.body}>
          Unfinished tasks with no planned work date. A task can still have a
          deadline.
        </Text>
      )}
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading tasks"
          color={theme.colors.accent}
        />
      ) : !error && visible.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            {mode === 'today'
              ? 'Nothing planned or overdue today. Add a step above, or plan a task from the Tasks tab.'
              : filter === 'completed'
                ? 'Completed tasks will appear here. Every step counts.'
                : filter === 'archived'
                  ? 'No archived tasks. Archived tasks can be restored here.'
                  : 'A little breathing room. Add a task when you are ready.'}
          </Text>
        </View>
      ) : (
        visible.map((task) => (
          <View key={task.id} style={styles.card}>
            <View style={formStyles.row}>
              {!task.archivedAt && (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
                  accessibilityState={{
                    checked: task.status === 'completed',
                    disabled: busy || !!error,
                  }}
                  disabled={busy || !!error}
                  onPress={() =>
                    void run(
                      {
                        kind:
                          task.status === 'completed' ? 'reopen' : 'complete',
                        id: task.id,
                      },
                      task.status === 'completed'
                        ? 'Task reopened.'
                        : 'Task completed.',
                    )
                  }
                  style={{ padding: 10, minWidth: 44, minHeight: 44 }}
                >
                  <Text style={{ fontSize: 24, color: theme.colors.accent }}>
                    {task.status === 'completed' ? '☑' : '□'}
                  </Text>
                </Pressable>
              )}
              <Text
                style={[
                  styles.heading,
                  { flex: 1 },
                  task.status === 'completed' && {
                    textDecorationLine: 'line-through',
                  },
                ]}
              >
                {task.title}
              </Text>
            </View>
            <Text style={styles.badge}>
              {task.priority.toUpperCase()} PRIORITY
              {isOverdue(task, today) ? ' · OVERDUE' : ''}
            </Text>
            {!!task.notes && <Text style={styles.body}>{task.notes}</Text>}
            {!!task.plannedDate && (
              <Text style={styles.body}>
                Planned {displayDate(task.plannedDate)}
              </Text>
            )}
            {!!task.dueDate && (
              <Text style={styles.body}>Due {displayDate(task.dueDate)}</Text>
            )}
            <View style={formStyles.row}>
              {task.archivedAt ? (
                <SmallButton
                  label="Restore"
                  disabled={busy || !!error}
                  onPress={() =>
                    void run({ kind: 'restore', id: task.id }, 'Task restored.')
                  }
                />
              ) : (
                <>
                  <SmallButton
                    label="Edit"
                    disabled={busy || !!error}
                    onPress={() => setEditor(task)}
                  />
                  <SmallButton
                    label="Archive"
                    disabled={busy || !!error}
                    onPress={() =>
                      Alert.alert(
                        'Archive task?',
                        'It will leave your active lists. You can restore it from Archived.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Archive',
                            onPress: () =>
                              void run(
                                { kind: 'archive', id: task.id },
                                'Task archived. Restore it from the Archived filter.',
                              ),
                          },
                        ],
                      )
                    }
                  />
                </>
              )}
            </View>
          </View>
        ))
      )}
      {editor !== undefined && (
        <TaskEditor
          task={editor}
          plannedDate={mode === 'today' ? today : null}
          onClose={() => setEditor(undefined)}
        />
      )}
    </>
  );
}
