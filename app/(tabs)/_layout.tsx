import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '../../src/theme';

const screens = [
  { name: 'index', title: 'Today', icon: '◉' },
  { name: 'tasks', title: 'Tasks', icon: '☑' },
  { name: 'goals', title: 'Goals', icon: '◎' },
  { name: 'reviews', title: 'Review', icon: '▤' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      {screens.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Text accessible={false} style={{ color, fontSize: 24 }}>
                {icon}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
