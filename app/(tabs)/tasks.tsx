import { Screen } from '../../src/components/Screen';
import { TaskWorkspace } from '../../src/features/tasks/TaskWorkspace';
export default function TasksScreen() {
  return (
    <Screen
      eyebrow="One step at a time"
      title="Your tasks"
      description="Capture it, give it a little space, and move it forward."
    >
      <TaskWorkspace mode="all" />
    </Screen>
  );
}
