import { Text, View } from 'react-native';
import { Screen, styles } from './Screen';

export function ComingNext({
  title,
  description,
  milestone,
  detail,
}: {
  title: string;
  description: string;
  milestone: string;
  detail: string;
}) {
  return (
    <Screen
      eyebrow="Build a meaningful week"
      title={title}
      description={description}
    >
      <View style={styles.card}>
        <Text style={styles.badge}>{milestone} · PLANNED</Text>
        <Text style={styles.heading}>A clear next step.</Text>
        <Text style={styles.body}>{detail}</Text>
      </View>
    </Screen>
  );
}
