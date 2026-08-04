'use client';

import { MotionSection } from '@/components/shared/motion';
import { useHoursSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getCurrentDay(): string {
  const dayIndex = new Date().getDay();
  return dayOrder[dayIndex === 0 ? 6 : dayIndex - 1];
}

export function OpeningHours() {
  const { data: hours } = useHoursSettings();
  const currentDay = getCurrentDay();

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <h2 className="font-heading text-4xl font-bold text-primary md:text-5xl">
              Visit Us
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded bg-brand-accent" />
          </div>
        </MotionSection>

        <MotionSection delay={0.2}>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="divide-y divide-border">
              {dayOrder.map((day) => {
                const dayHours = hours?.[day];
                const isClosed = dayHours?.closed;
                const isToday = day === currentDay;

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
                      {day}
                      {isToday && (
                        <span className="ml-2 text-xs text-primary">(Today)</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        isClosed ? 'font-medium text-secondary' : 'text-muted-foreground'
                      )}
                    >
                      {isClosed || !dayHours?.open || !dayHours?.close
                        ? 'Closed'
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
