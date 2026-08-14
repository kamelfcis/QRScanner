'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Use it to gate anything sourced from localStorage (cart, dining mode) so the
 * server and client markup always agree on the first paint.
 */
export function useClientMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
