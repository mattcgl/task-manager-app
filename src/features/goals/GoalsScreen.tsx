import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen, styles } from '../../components/Screen';
import { DateField, SmallButton, formStyles } from '../tasks/TaskEditor';
import { useTasks } from '../tasks/TaskProvider';
import { goalProgress, type Goal, type GoalInput } from '../../domain/goals';
import { displayDate } from '../../domain/dates';
import type { GoalCommand } from '../../data/goals';
import { theme } from '../../theme';

function GoalEditor({ goal, close }: { goal: Goal | null; close: () => void }) {
  const { busy, executeGoal } = useTasks();
  const [input, setInput] = useState<GoalInput>(
    goal
      ? {
          title: goal.title,
          description: goal.description,
          targetDate: goal.targetDate,
        }
      : { title: '', description: '', targetDate: null },
  );
  const [error, setError] = useState('');
  async function save() {
    setError('');
    try {
      await executeGoal(
        goal ? { kind: 'edit', id: goal.id, input } : { kind: 'create', input },
      );
      close();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save this goal. Please try again.',
      );
    }
  }
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!busy) close();
      }}
    >
      <Screen
        eyebrow="Give your days direction"
        title={goal ? 'Edit your goal' : 'What matters to you?'}
        description="Start with a direction. You can build the steps along the way."
      >
        <SmallButton label="Cancel" onPress={close} disabled={busy} />
        <View style={styles.card}>
          <Text style={styles.heading}>Goal title</Text>
          <TextInput
            accessibilityLabel="Goal title"
            value={input.title}
            onChangeText={(title) => setInput({ ...input, title })}
            maxLength={200}
            editable={!busy}
            style={formStyles.input}
            placeholder="What do you want to achieve?"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.heading}>Why it matters</Text>
          <TextInput
            accessibilityLabel="Goal description"
            value={input.description}
            onChangeText={(description) => setInput({ ...input, description })}
            maxLength={5000}
            editable={!busy}
            style={styles.input}
            multiline
            placeholder="A little motivation for future you"
            placeholderTextColor={theme.colors.muted}
          />
          <DateField
            label="Target date"
            help="An optional date to aim for."
            value={input.targetDate}
            onChange={(targetDate) => setInput({ ...input, targetDate })}
            disabled={busy}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <SmallButton
            label={busy ? 'Saving…' : 'Save goal'}
            onPress={save}
            disabled={busy}
            selected
          />
        </View>
      </Screen>
    </Modal>
  );
}

export function GoalsScreen() {
  const { goals, tasks, loading, busy, error, refresh, executeGoal } =
    useTasks();
  const [filter, setFilter] = useState<'active' | 'completed' | 'archived'>(
    'active',
  );
  const [editor, setEditor] = useState<Goal | null | undefined>(undefined);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const visible = goals.filter((goal) =>
    filter === 'archived'
      ? !!goal.archivedAt
      : !goal.archivedAt && goal.status === filter,
  );
  async function run(command: GoalCommand, success: string) {
    setActionError('');
    setMessage('');
    try {
      await executeGoal(command);
      setMessage(success);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : 'Could not update your goal.',
      );
    }
  }
  return (
    <Screen
      eyebrow="The bigger picture"
      title="Your goals"
      description="Connect the things you do to the life you want to build."
    >
      <SmallButton
        label="Create a goal"
        selected
        onPress={() => setEditor(null)}
        disabled={loading || busy || !!error}
      />
      <View style={formStyles.row}>
        {(['active', 'completed', 'archived'] as const).map((value) => (
          <SmallButton
            key={value}
            label={value[0].toUpperCase() + value.slice(1)}
            selected={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </View>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {message}
        </Text>
      )}
      {!!actionError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {actionError}
        </Text>
      )}
      {!!error && (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <SmallButton
            label="Refresh goals"
            onPress={() => void refresh()}
            disabled={busy}
          />
        </View>
      )}
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading goals"
          color={theme.colors.accent}
        />
      ) : !error && visible.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.heading}>
            {filter === 'active'
              ? 'A direction worth taking.'
              : `No ${filter} goals yet.`}
          </Text>
          <Text style={styles.body}>
            {filter === 'active'
              ? 'Create a goal, then link a task through Add with details or Edit in the Tasks tab.'
              : 'Your goals will appear here when you move them.'}
          </Text>
        </View>
      ) : (
        visible.map((goal) => {
          const progress = goalProgress(goal.id, tasks);
          return (
            <View key={goal.id} style={styles.card}>
              <Text style={styles.badge}>
                {goal.archivedAt ? 'ARCHIVED' : goal.status.toUpperCase()}
              </Text>
              <Text style={styles.heading}>{goal.title}</Text>
              {!!goal.description && (
                <Text style={styles.body}>{goal.description}</Text>
              )}
              {!!goal.targetDate && (
                <Text style={styles.body}>
                  Target {displayDate(goal.targetDate)}
                </Text>
              )}
              <Text style={styles.body}>
                {progress.total
                  ? `${progress.completed} of ${progress.total} linked tasks completed · ${progress.percent}%`
                  : 'No task progress yet. Link a task to start measuring your steps.'}
              </Text>
              {progress.percent !== null && (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Task progress for ${goal.title}`}
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: progress.percent,
                  }}
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.colors.soft,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      width: `${progress.percent}%`,
                      backgroundColor: theme.colors.accent,
                    }}
                  />
                </View>
              )}
              <Text style={styles.body}>
                Task progress is one part of your goal. You decide when the goal
                is complete.
              </Text>
              <View style={formStyles.row}>
                {goal.archivedAt ? (
                  <SmallButton
                    label="Restore goal"
                    disabled={busy || !!error}
                    onPress={() =>
                      void run(
                        { kind: 'restore', id: goal.id },
                        'Goal restored.',
                      )
                    }
                  />
                ) : (
                  <>
                    <SmallButton
                      label="Edit goal"
                      disabled={busy || !!error}
                      onPress={() => setEditor(goal)}
                    />
                    <SmallButton
                      label={
                        goal.status === 'completed'
                          ? 'Reopen goal'
                          : 'Complete goal'
                      }
                      disabled={busy || !!error}
                      onPress={() =>
                        void run(
                          {
                            kind:
                              goal.status === 'completed'
                                ? 'reopen'
                                : 'complete',
                            id: goal.id,
                          },
                          goal.status === 'completed'
                            ? 'Goal reopened.'
                            : 'Goal completed. Your work counts.',
                        )
                      }
                    />
                    <SmallButton
                      label="Archive goal"
                      disabled={busy || !!error}
                      onPress={() =>
                        Alert.alert(
                          'Archive this goal?',
                          'Linked tasks will stay where they are. You can restore this goal later.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Archive',
                              onPress: () =>
                                void run(
                                  { kind: 'archive', id: goal.id },
                                  'Goal archived. Linked tasks are preserved.',
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
          );
        })
      )}
      {editor !== undefined && (
        <GoalEditor goal={editor} close={() => setEditor(undefined)} />
      )}
    </Screen>
  );
}
