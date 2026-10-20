import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen, styles } from '../../src/components/Screen';
import {
  readFoundationNote,
  saveFoundationNote,
} from '../../src/data/settings';
import { theme } from '../../src/theme';
import { TaskWorkspace } from '../../src/features/tasks/TaskWorkspace';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    readFoundationNote(db)
      .then((value) => {
        if (active) setNote(value);
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setError(
            'Your saved note could not be loaded. Reopen the app to try again.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db]);

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveFoundationNote(db, note);
      setMessage('Saved on this phone.');
    } catch {
      setError(
        'Could not save. Your changes are still here; please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      eyebrow="A little progress, every day"
      title="Make today count."
      description="A little intention. A few meaningful steps."
    >
      <TaskWorkspace mode="today" />
      <View style={styles.card}>
        <Text style={styles.badge}>YOUR INTENTION</Text>
        <Text style={styles.heading}>Start with one intention.</Text>
        <Text style={styles.body}>
          What would make today feel worthwhile? Keep a reminder for yourself.
        </Text>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading saved note"
            color={theme.colors.accent}
          />
        ) : (
          <>
            <TextInput
              accessibilityLabel="Today's intention"
              placeholder="Today, I want to…"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              multiline
              maxLength={2000}
              value={note}
              editable={!saving && !loadFailed}
              onChangeText={(value) => {
                setNote(value);
                setMessage('');
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving || loadFailed }}
              disabled={saving || loadFailed}
              onPress={save}
              style={[
                styles.button,
                (saving || loadFailed) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.buttonText}>
                {saving ? 'Saving…' : 'Save intention'}
              </Text>
            </Pressable>
          </>
        )}
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {message}
          </Text>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    </Screen>
  );
}
