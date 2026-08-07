'use client';

import { useState, useEffect } from 'react';
import { MotionSection } from '@/components/shared/motion';
import { useHoursSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getCurrentDay(): string {
  const dayIndex = new Date().getDay();
  return dayOrder[dayIndex === 0 ? 6 : dayIndex - 1];
}

export function OpeningHours() {
  const { data: hours } = useHoursSettings();
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const t = useTranslations('landing');
  const daysT = useTranslations('days');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client day highlight
    setCurrentDay(getCurrentDay());
  }, []);

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
              {t('visitUs')}
            </h2>
            <div className="bg-brand-accent mx-auto mt-4 h-1 w-20 rounded" />
          </div>
        </MotionSection>

        <MotionSection delay={0.2}>
          <div className="bg-card ring-foreground/10 mx-auto max-w-2xl overflow-hidden rounded-xl ring-1">
            <div className="divide-border divide-y">
              {dayOrder.map((day) => {
                const dayHours = hours?.[day];
                const isClosed = dayHours?.closed;
                const isToday = currentDay !== null && day === currentDay;

                return (
                  <div
                    key={day}
                    className={cn(
                      'flex items-center justify-between px-6 py-4',
                      isToday && 'bg-primary/5'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium capitalize',
                        isToday ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {daysT(day)}
                      {isToday && <span className="text-primary ml-2 text-xs">({t('today')})</span>}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        isClosed ? 'text-secondary font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {isClosed || !dayHours?.open || !dayHours?.close
                        ? t('closed')
                        : `${dayHours.open} - ${dayHours.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
