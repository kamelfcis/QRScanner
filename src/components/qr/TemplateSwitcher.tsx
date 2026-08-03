'use client';

import { QR_TEMPLATES, getTemplate } from '@/lib/qr/templates';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TemplateSwitcherProps {
  value: string;
  onChange: (template: string) => void;
  className?: string;
}

export function TemplateSwitcher({ value, onChange, className }: TemplateSwitcherProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>Template</Label>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
        {Object.values(QR_TEMPLATES).map((tmpl) => {
          const isActive = value === tmpl.name;
          const preview = getTemplate(tmpl.name);
          return (
            <button
              key={tmpl.name}
              type="button"
              onClick={() => onChange(tmpl.name)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                isActive
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-muted hover:border-muted-foreground/50'
              )}
              aria-label={`${tmpl.label} template`}
              aria-pressed={isActive}
            >
              <div
                className="h-6 w-6 rounded-sm border"
                style={{
                  backgroundColor: preview.bgColor,
                  borderColor: preview.fgColor,
                }}
              >
                <div
                  className="m-1 h-4 w-4"
                  style={{
                    backgroundColor: preview.fgColor,
                    borderRadius: preview.roundedStyle === 'circle' ? '50%' : preview.roundedStyle === 'rounded' ? '2px' : 0,
                  }}
                />
              </div>
              <span className="text-[10px] font-medium">{tmpl.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
