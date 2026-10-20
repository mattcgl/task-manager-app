import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

type Props = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function Screen({ eyebrow, title, description, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 18,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 16,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  description: { color: theme.colors.muted, fontSize: 17, lineHeight: 26 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    gap: 14,
  },
  heading: { color: theme.colors.ink, fontSize: 20, fontWeight: '600' },
  body: { color: theme.colors.muted, fontSize: 16, lineHeight: 24 },
  badge: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  input: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: theme.colors.ink,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: theme.colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  error: { color: theme.colors.danger, fontSize: 16, lineHeight: 24 },
});
