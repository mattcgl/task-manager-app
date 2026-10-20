import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen, styles } from '../../components/Screen';
import { addDays, displayDate, localDate, parseDate } from '../../domain/dates';
import type { Priority, Task, TaskInput } from '../../domain/tasks';
import { theme } from '../../theme';
import { useTasks } from './TaskProvider';

export function SmallButton({
  label,
  onPress,
  disabled = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        formStyles.smallButton,
        selected && formStyles.selected,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[formStyles.smallText, selected && { color: '#FFFFFF' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DateField({
  label,
  help,
  value,
  onChange,
  disabled,
}: {
  label: string;
  help: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={formStyles.field}>
      <Text style={styles.heading}>{label}</Text>
      <Text style={styles.body}>{help}</Text>
      <SmallButton
        label={`${label}: ${value ? displayDate(value) : 'Not set'}`}
        disabled={disabled}
        onPress={() => {
          if (!open && !value && Platform.OS === 'ios') onChange(localDate());
          setOpen(!open);
        }}
      />
      <View style={formStyles.row}>
        <SmallButton
          label="Today"
          disabled={disabled}
          onPress={() => onChange(localDate())}
        />
        <SmallButton
          label="Tomorrow"
          disabled={disabled}
          onPress={() => onChange(addDays(localDate(), 1))}
        />
        {value && (
          <SmallButton
            label={`Clear ${label.toLowerCase()}`}
            disabled={disabled}
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        )}
      </View>
      {open && (
        <>
          <DateTimePicker
            accessibilityLabel={label}
            value={value ? parseDate(value) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="light"
            minimumDate={new Date(1900, 0, 1)}
            maximumDate={new Date(9999, 11, 31)}
            disabled={disabled}
            onChange={(event, date) => {
              if (Platform.OS !== 'ios') setOpen(false);
              if (event.type === 'set' && date) onChange(localDate(date));
            }}
          />
          {Platform.OS === 'ios' && (
            <SmallButton
              label="Done choosing date"
              onPress={() => setOpen(false)}
            />
          )}
        </>
      )}
    </View>
  );
}

export function TaskEditor({
  task,
  plannedDate,
  onClose,
}: {
  task: Task | null;
  plannedDate: string | null;
  onClose: () => void;
}) {
  const { execute, busy } = useTasks();
  const [input, setInput] = useState<TaskInput>(
    task
      ? {
          title: task.title,
          notes: task.notes,
          priority: task.priority,
          plannedDate: task.plannedDate,
          dueDate: task.dueDate,
        }
      : {
          title: '',
          notes: '',
          priority: 'normal',
          plannedDate,
          dueDate: null,
        },
  );
  const [error, setError] = useState('');
  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setError('');
  }
  async function save() {
    setError('');
    try {
      await execute(
        task ? { kind: 'edit', id: task.id, input } : { kind: 'create', input },
      );
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save. Please try again.',
      );
    }
  }
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <Screen
        eyebrow="One step at a time"
        title={task ? 'Edit your task' : 'Make a little plan'}
        description="Choose what matters. Dates are optional."
      >
        <SmallButton label="Cancel" onPress={onClose} disabled={busy} />
        <View style={styles.card}>
          <Text style={styles.heading}>Task title</Text>
          <TextInput
            accessibilityLabel="Task title"
            style={formStyles.input}
            placeholder="What do you want to do?"
            placeholderTextColor={theme.colors.muted}
            value={input.title}
            onChangeText={(value) => update('title', value)}
            maxLength={200}
            editable={!busy}
            autoFocus={!task}
          />
          <Text style={styles.heading}>Notes</Text>
          <TextInput
            accessibilityLabel="Task notes"
            style={styles.input}
            placeholder="A little context, if you need it"
            placeholderTextColor={theme.colors.muted}
            value={input.notes}
            onChangeText={(value) => update('notes', value)}
            multiline
            maxLength={5000}
            editable={!busy}
          />
          <Text style={styles.heading}>Priority</Text>
          <View style={formStyles.row}>
            {(['low', 'normal', 'high'] as Priority[]).map((priority) => (
              <SmallButton
                key={priority}
                label={priority[0].toUpperCase() + priority.slice(1)}
                selected={input.priority === priority}
                onPress={() => update('priority', priority)}
                disabled={busy}
              />
            ))}
          </View>
          <DateField
            label="Planned date"
            help="When you intend to work on this task."
            value={input.plannedDate}
            onChange={(value) => update('plannedDate', value)}
            disabled={busy}
          />
          <DateField
            label="Due date"
            help="The deadline, if there is one."
            value={input.dueDate}
            onChange={(value) => update('dueDate', value)}
            disabled={busy}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={save}
            style={[styles.button, busy && { opacity: 0.5 }]}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Saving…' : 'Save task'}
            </Text>
          </Pressable>
        </View>
      </Screen>
    </Modal>
  );
}

export const formStyles = StyleSheet.create({
  field: { gap: 10, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: { ...styles.input, minHeight: 48 },
  smallButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.soft,
    justifyContent: 'center',
  },
  smallText: { fontSize: 14, color: theme.colors.accent, fontWeight: '600' },
  selected: { backgroundColor: theme.colors.accent },
});
