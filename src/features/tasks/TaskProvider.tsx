import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { Task } from '../../domain/tasks';
import type { Goal } from '../../domain/goals';
import {
  applyGoalCommand,
  listGoals,
  type GoalCommand,
} from '../../data/goals';
import {
  applyTaskCommand,
  listTasks,
  type TaskCommand,
} from '../../data/tasks';

type Store = {
  tasks: Task[];
  goals: Goal[];
  loading: boolean;
  busy: boolean;
  error: string;
  refresh: () => Promise<void>;
  execute: (command: TaskCommand) => Promise<void>;
  executeGoal: (command: GoalCommand) => Promise<void>;
};
const TaskContext = createContext<Store | null>(null);

export function TaskProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(() => {
    const id = ++request.current;
    return Promise.all([listTasks(db), listGoals(db)])
      .then(([result, goalResult]) => {
        if (id === request.current) {
          setTasks(result);
          setGoals(goalResult);
          setError('');
        }
      })
      .catch(() => {
        if (id === request.current)
          setError(
            'Could not refresh your planner. Your saved data has not been removed. Try again.',
          );
      })
      .finally(() => {
        if (id === request.current) setLoading(false);
      });
  }, [db]);
  useEffect(() => {
    const generation = request;
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);

  async function mutate(work: () => Promise<void>) {
    if (lock.current)
      throw new Error(
        'A change is still saving. Please try again in a moment.',
      );
    lock.current = true;
    setBusy(true);
    try {
      await work();
      await refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const execute = (command: TaskCommand) =>
    mutate(() => applyTaskCommand(db, command, randomUUID));
  const executeGoal = (command: GoalCommand) =>
    mutate(() => applyGoalCommand(db, command, randomUUID));
  return (
    <TaskContext.Provider
      value={{
        tasks,
        goals,
        loading,
        busy,
        error,
        refresh,
        execute,
        executeGoal,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('TaskProvider is missing.');
  return context;
}
