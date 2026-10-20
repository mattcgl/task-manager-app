import { Component, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateDatabase } from '../src/data/migrations';
import { Screen, styles } from '../src/components/Screen';
import { TaskProvider } from '../src/features/tasks/TaskProvider';

class DatabaseBoundary extends Component<
  PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <Screen
          eyebrow="Storage unavailable"
          title="Your data comes first."
          description="The app could not open its local database."
        >
          <View style={styles.card}>
            <Text style={styles.body}>
              Close and reopen the app. If this continues, keep the app
              installed to preserve its data and report the issue. Do not clear
              storage.
            </Text>
          </View>
        </Screen>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DatabaseBoundary>
        <SQLiteProvider databaseName="task-goal.db" onInit={migrateDatabase}>
          <TaskProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </TaskProvider>
        </SQLiteProvider>
      </DatabaseBoundary>
    </SafeAreaProvider>
  );
}
