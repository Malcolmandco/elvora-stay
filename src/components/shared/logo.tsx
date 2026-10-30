import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function Logo({ variant = 'dark', className }: LogoProps) {
  return (
    <Link
      to="/"
      aria-label="Elvora Stay — Home"
      className={cn(
        'inline-flex flex-col leading-none no-underline',
        className
      )}
    >
      <span
        className={cn(
          'font-serif text-2xl font-medium tracking-[0.15em] transition-colors',
          variant === 'light' ? 'text-white' : 'text-foreground'
        )}
      >
        ELVORA
      </span>
      <span
        className={cn(
          'font-sans text-[0.625rem] font-medium uppercase tracking-[0.5em] transition-colors',
          variant === 'light' ? 'text-white/70' : 'text-muted-foreground'
        )}
      >
        Stay
      </span>
    </Link>
  );
}
