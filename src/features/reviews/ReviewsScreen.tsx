import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen, styles } from '../../components/Screen';
import { SmallButton, formStyles } from '../tasks/TaskEditor';
import { useTasks } from '../tasks/TaskProvider';
import { useToday } from '../tasks/useToday';
import { addDays, displayDate, weekStart } from '../../domain/dates';
import {
  emptyReflection,
  followingWeekPlanDate,
  type Reflection,
  type ReviewItem,
  type WeeklyReview,
} from '../../domain/reviews';
import { loadReview } from '../../data/reviews';
import { theme } from '../../theme';

const prompts: { key: keyof Reflection; title: string; placeholder: string }[] =
  [
    {
      key: 'accomplishments',
      title: 'What went well?',
      placeholder: 'Progress worth remembering, big or small…',
    },
    {
      key: 'unfinished',
      title: 'What stayed unfinished?',
      placeholder: 'What did you intend to finish?',
    },
    {
      key: 'obstacles',
      title: 'What got in the way?',
      placeholder: 'Notice the obstacles without judging yourself.',
    },
    {
      key: 'changes',
      title: 'What will you change?',
      placeholder: 'One adjustment for the coming week…',
    },
    {
      key: 'priorities',
      title: 'Next week’s priorities',
      placeholder: 'What deserves your attention next?',
    },
  ];

function SummaryList({ title, items }: { title: string; items: ReviewItem[] }) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title} · {items.length}
      </Text>
      {items.length ? (
        items.map((item) => (
          <Text key={item.id} style={styles.body}>
            • {item.title}
            {item.reason
              ? ` (${item.reason})`
              : !item.committed
                ? ' (unplanned work)'
                : ''}
          </Text>
        ))
      ) : (
        <Text style={styles.body}>Nothing in this category.</Text>
      )}
    </View>
  );
}

export function ReviewPanel({
  week,
  zone,
  onDirty,
}: {
  week: string;
  zone: string;
  onDirty: (value: boolean) => void;
}) {
  const db = useSQLiteContext();
  // Keep an in-progress form stable if the device zone changes while traveling.
  const [initialZone] = useState(zone);
  const { tasks, busy, execute, saveWeeklyReview } = useTasks();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [reflection, setReflection] = useState(emptyReflection);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    loadReview(db, week, initialZone)
      .then((result) => {
        if (active) {
          setReview(result);
          setReflection(result.reflection);
          setError('');
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not load this review. Please try again.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, week, initialZone, reload]);

  async function save(finalize: boolean) {
    if (!review || working || busy) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveWeeklyReview({
        weekStart: week,
        timeZone: review.timeZone,
        reflection,
        finalize,
        expectedRevision: review.revision,
      });
      setReview(saved);
      setReflection(saved.reflection);
      onDirty(false);
      setMessage(
        saved.status === 'finalized'
          ? 'Review saved. Historical summary is locked.'
          : 'Draft saved. You can return to it later.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save. Your reflection is still here.',
      );
    } finally {
      setWorking(false);
    }
  }
  async function refreshSummary() {
    if (!review || working) return;
    setWorking(true);
    setError('');
    try {
      const result = await loadReview(db, week, review.timeZone);
      if (result.revision !== review.revision)
        throw new Error(
          'This review changed. Reload the saved review before editing further.',
        );
      setReview(result);
      setMessage('Summary refreshed. Your reflection text is unchanged.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not refresh the summary.',
      );
    } finally {
      setWorking(false);
    }
  }
  function reloadSaved() {
    Alert.alert(
      'Reload saved review?',
      'Any unsaved reflection edits will be discarded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reload',
          onPress: () => {
            setLoading(true);
            setReview(null);
            onDirty(false);
            setReload((value) => value + 1);
          },
        },
      ],
    );
  }
  if (loading)
    return (
      <ActivityIndicator
        accessibilityLabel="Loading weekly review"
        color={theme.colors.accent}
      />
    );
  if (!review)
    return (
      <View style={styles.card}>
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
        <SmallButton
          label="Retry review"
          onPress={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
        />
      </View>
    );
  const snapshot = review.snapshot;
  const locked = review.status === 'finalized';
  const disabled = busy || working;
  const planDate = followingWeekPlanDate(snapshot);
  async function plan(id: string) {
    if (!planDate) return;
    setWorking(true);
    setError('');
    try {
      await execute({ kind: 'plan', id, plannedDate: planDate });
      setMessage(
        `Task planned for ${displayDate(planDate)}. The original weekly commitment is preserved.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not plan this task.',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.badge}>
          {locked ? 'FINALIZED REVIEW' : 'DRAFT REVIEW'}
          {snapshot.partial ? ' · WEEK SO FAR' : ''}
        </Text>
        <Text style={styles.body}>Time zone: {review.timeZone}</Text>
        <Text style={styles.body}>
          Summary as of{' '}
          {new Date(snapshot.cutoff).toLocaleString(undefined, {
            timeZone: review.timeZone,
          })}
        </Text>
        <Text style={styles.body}>
          {snapshot.commitmentCount} weekly commitments. Completed work includes
          unplanned tasks and counts each task once if it was still complete at
          the cutoff.
        </Text>
        <Text style={styles.body}>
          {locked
            ? 'This summary is a saved historical snapshot. Reflection text can still be edited below.'
            : 'Refresh the summary after changing tasks. Finalizing captures the latest saved task history.'}
        </Text>
        {!locked && (
          <SmallButton
            label="Refresh summary"
            onPress={refreshSummary}
            disabled={disabled}
          />
        )}
      </View>
      {!!error && (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <SmallButton
            label="Reload saved review"
            onPress={reloadSaved}
            disabled={disabled}
          />
        </View>
      )}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {message}
        </Text>
      )}
      <SummaryList title="Accomplishments" items={snapshot.accomplishments} />
      <SummaryList title="Unfinished commitments" items={snapshot.unfinished} />
      <SummaryList title="Set aside" items={snapshot.setAside} />
      {snapshot.alreadyComplete.length > 0 && (
        <SummaryList
          title="Completed before this week"
          items={snapshot.alreadyComplete}
        />
      )}
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>
          Make sense of your week
        </Text>
        {prompts.map(({ key, title, placeholder }) => (
          <View key={key} style={formStyles.field}>
            <Text style={styles.heading}>{title}</Text>
            <TextInput
              accessibilityLabel={title}
              style={styles.input}
              value={reflection[key]}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.muted}
              multiline
              maxLength={5000}
              editable={!disabled}
              onChangeText={(value) => {
                setReflection((current) => ({ ...current, [key]: value }));
                onDirty(true);
                setMessage('');
              }}
            />
          </View>
        ))}
        <SmallButton
          label={locked ? 'Save reflection changes' : 'Save draft'}
          selected
          disabled={disabled}
          onPress={() => void save(false)}
        />
        {!locked && (
          <SmallButton
            label="Finalize review"
            disabled={disabled}
            onPress={() =>
              Alert.alert(
                'Finalize this review?',
                `${snapshot.partial ? 'This week is still in progress. ' : ''}The summary will be frozen at the time you save. Later task changes will not rewrite it. You can still edit reflection text.`,
                [
                  { text: 'Keep draft', style: 'cancel' },
                  { text: 'Finalize', onPress: () => void save(true) },
                ],
              )
            }
          />
        )}
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>
          Choose what comes next
        </Text>
        <Text style={styles.body}>
          Nothing carries over automatically.{' '}
          {planDate
            ? `Choose unfinished work to plan for ${displayDate(planDate)} in the following week.`
            : 'The following week has already passed. Use Tasks to choose a current work date.'}
        </Text>
        {planDate &&
          snapshot.unfinished.map((item) => {
            const current = tasks.find((task) => task.id === item.id);
            const unavailable =
              !current || !!current.archivedAt || current.status !== 'open';
            const alreadyPlanned = current?.plannedDate === planDate;
            return (
              <View key={item.id} style={formStyles.field}>
                <Text style={styles.body}>{item.title}</Text>
                <SmallButton
                  label={
                    unavailable
                      ? 'No longer unfinished'
                      : alreadyPlanned
                        ? 'Already planned'
                        : `Plan for ${displayDate(planDate)}`
                  }
                  disabled={disabled || unavailable || alreadyPlanned}
                  onPress={() => {
                    if (current?.plannedDate)
                      Alert.alert(
                        'Move this task?',
                        `Move its planned date from ${displayDate(current.plannedDate)} to ${displayDate(planDate)}? Its original commitment stays in your history.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Move task',
                            onPress: () => void plan(item.id),
                          },
                        ],
                      );
                    else void plan(item.id);
                  }}
                />
              </View>
            );
          })}
      </View>
    </>
  );
}

export function ReviewsScreen() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const currentWeek = weekStart(useToday());
  const [week, setWeek] = useState(currentWeek);
  const [dirty, setDirty] = useState(false);
  const { busy } = useTasks();
  function navigate(next: string) {
    const go = () => {
      setDirty(false);
      setWeek(next);
    };
    if (dirty)
      Alert.alert(
        'Leave unsaved reflection?',
        'Save your draft first to keep these edits, or discard them to change weeks.',
        [
          { text: 'Stay here', style: 'cancel' },
          { text: 'Discard edits', style: 'destructive', onPress: go },
        ],
      );
    else go();
  }
  return (
    <Screen
      eyebrow="Pause. Reflect. Begin again."
      title="Your weekly review"
      description="Notice your progress, learn from the obstacles, and give next week a little direction."
    >
      <Text accessibilityRole="header" style={styles.heading}>
        {displayDate(week)} – {displayDate(addDays(week, 6))}
      </Text>
      <View style={formStyles.row}>
        <SmallButton
          label="Previous week"
          disabled={busy}
          onPress={() => navigate(addDays(week, -7))}
        />
        <SmallButton
          label="Next week"
          disabled={busy || week >= currentWeek}
          onPress={() => navigate(addDays(week, 7))}
        />
        <SmallButton
          label="This week"
          disabled={busy || week === currentWeek}
          onPress={() => navigate(currentWeek)}
        />
      </View>
      <ReviewPanel key={week} week={week} zone={zone} onDirty={setDirty} />
    </Screen>
  );
}
