import { cn } from '@/lib/utils';

interface LoginBrandNameProps {
  name: string;
  as?: 'p' | 'h1';
  className: string;
}

/** Keeps the login name slot at text height until restaurant settings supply a name. */
export function LoginBrandName({ name, as: Tag = 'p', className }: LoginBrandNameProps) {
  const label = name.trim();

  return (
    <Tag className={className} aria-busy={label ? undefined : true}>
      {label ? (
        label
      ) : (
        <span
          aria-hidden
          className={cn(
            'inline-block h-[0.72em] w-[5.5ch] animate-pulse rounded-[0.2em] bg-current/30 align-middle'
          )}
        />
      )}
    </Tag>
  );
}
