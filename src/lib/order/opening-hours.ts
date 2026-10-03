import type { HoursSettings } from '@/types/database';

export const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayKey = (typeof DAY_ORDER)[number];

export interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface NextOpenInfo {
  dayKey: DayKey;
  time: string;
  /** Minutes until open (same-day or next open day). */
  minutesUntil: number;
}

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getDayKey(date: Date): DayKey {
  const dayIndex = date.getDay();
  return DAY_ORDER[dayIndex === 0 ? 6 : dayIndex - 1];
}

function dayHoursFor(hours: HoursSettings | undefined, dayKey: DayKey): DayHours | undefined {
  return hours?.[dayKey];
}

function isOpenAtMinutes(dayHours: DayHours | undefined, minutes: number): boolean {
  if (!dayHours || dayHours.closed) return false;
  const open = dayHours.open ? parseTimeToMinutes(dayHours.open) : null;
  const close = dayHours.close ? parseTimeToMinutes(dayHours.close) : null;
  if (open == null || close == null) return false;

  if (close <= open) {
    return minutes >= open || minutes < close;
  }
  return minutes >= open && minutes < close;
}

/** True when no hours configured (legacy tenants) or current time is inside today's window. */
export function isWithinOpeningHours(
  hours: HoursSettings | undefined,
  now: Date = new Date()
): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;

  const dayKey = getDayKey(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = dayHoursFor(hours, dayKey);

  if (isOpenAtMinutes(today, minutes)) return true;

  // Overnight window from previous day (e.g. Fri 22:00 – Sat 02:00)
  const prevIndex = (DAY_ORDER.indexOf(dayKey) + 6) % 7;
  const prevDay = dayHoursFor(hours, DAY_ORDER[prevIndex]);
  if (!prevDay || prevDay.closed) return false;
  const prevOpen = prevDay.open ? parseTimeToMinutes(prevDay.open) : null;
  const prevClose = prevDay.close ? parseTimeToMinutes(prevDay.close) : null;
  if (prevOpen == null || prevClose == null || prevClose > prevOpen) return false;
  return minutes < prevClose;
}

export function getNextOpenInfo(
  hours: HoursSettings | undefined,
  now: Date = new Date()
): NextOpenInfo | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  if (isWithinOpeningHours(hours, now)) return null;

  const startMinutes = now.getHours() * 60 + now.getMinutes();
  const startDayIndex = DAY_ORDER.indexOf(getDayKey(now));

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (startDayIndex + offset) % 7;
    const dayKey = DAY_ORDER[dayIndex];
    const dayHours = dayHoursFor(hours, dayKey);
    if (!dayHours || dayHours.closed || !dayHours.open) continue;

    const openMinutes = parseTimeToMinutes(dayHours.open);
    if (openMinutes == null) continue;

    if (offset === 0 && openMinutes <= startMinutes) continue;

    const daysAhead = offset;
    const minutesUntil = daysAhead * 24 * 60 + (openMinutes - startMinutes);
    return {
      dayKey,
      time: dayHours.open,
      minutesUntil,
    };
  }

  return null;
}

/** Combined pause signal: manual toggle OR outside opening hours (client-side). */
export function isCustomerOrderingPaused(
  acceptingOrders: boolean | undefined,
  hours: HoursSettings | undefined,
  now: Date = new Date()
): boolean {
  if (acceptingOrders === false) return true;
  return !isWithinOpeningHours(hours, now);
}
