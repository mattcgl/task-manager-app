import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDate } from '../../domain/dates';

export function useToday() {
  const [today, setToday] = useState(localDate());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      timer = setTimeout(
        update,
        Math.min(60_000, midnight.getTime() - now.getTime() + 20),
      );
    };
    const update = () => {
      clearTimeout(timer);
      setToday(localDate());
      schedule();
    };
    const subscription = AppState.addEventListener('change', update);
    schedule();
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, []);
  return today;
}
