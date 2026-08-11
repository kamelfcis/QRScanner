'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type CustomersViewMode = 'table' | 'card';

const STORAGE_KEY = 'engaz-customers-view';
const VIEW_EVENT = 'engaz-customers-view-change';

function getSnapshot(): CustomersViewMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'card' ? 'card' : 'table';
}

function getServerSnapshot(): CustomersViewMode {
  return 'table';
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(VIEW_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(VIEW_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function useCustomersViewMode() {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = useCallback((mode: CustomersViewMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new Event(VIEW_EVENT));
  }, []);

  return [view, setView] as const;
}
