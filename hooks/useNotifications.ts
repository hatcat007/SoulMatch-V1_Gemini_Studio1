import { useContext, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

/**
 * A custom hook that persists state to sessionStorage.
 * It behaves like useState, but automatically saves the state to sessionStorage
 * whenever it changes and restores it on component mount.
 * @param key The key to use for storing the value in sessionStorage.
 * @param initialValue The initial value to use if nothing is stored.
 * @returns A stateful value, and a function to update it.
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      // If the item exists, parse it. Otherwise, return the initial value.
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If parsing fails, log the error and return the initial value.
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      // Every time the state changes, save it to sessionStorage.
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}
