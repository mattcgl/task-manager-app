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
import {
  applyTaskCommand,
  listTasks,
  type TaskCommand,
} from '../../data/tasks';

type Store = {
  tasks: Task[];
  loading: boolean;
  busy: boolean;
  error: string;
  refresh: () => Promise<void>;
  execute: (command: TaskCommand) => Promise<void>;
};
const TaskContext = createContext<Store | null>(null);

export function TaskProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(() => {
    const id = ++request.current;
    return listTasks(db)
      .then((result) => {
        if (id === request.current) {
          setTasks(result);
          setError('');
        }
      })
      .catch(() => {
        if (id === request.current)
          setError(
            'Could not refresh tasks. Your saved data has not been removed. Try again.',
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

  async function execute(command: TaskCommand) {
    if (lock.current)
      throw new Error('A task is still saving. Please try again in a moment.');
    lock.current = true;
    setBusy(true);
    try {
      await applyTaskCommand(db, command, randomUUID);
      await refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <TaskContext.Provider
      value={{ tasks, loading, busy, error, refresh, execute }}
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
