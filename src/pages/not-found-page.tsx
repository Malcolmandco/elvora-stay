import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="eyebrow-accent mb-4">404</p>
      <h1 className="font-serif text-6xl font-light tracking-tight text-foreground md:text-8xl">
        Lost?
      </h1>
      <p className="mt-6 max-w-md text-base text-muted-foreground">
        The page you're looking for doesn't exist or has been moved. Let's get you back to somewhere extraordinary.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
      >
        Return Home
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
