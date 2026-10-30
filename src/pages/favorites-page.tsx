import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Search } from 'lucide-react';
import { useFavorites } from '@/context/favorites-context';

export function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <div className="bg-background pt-24 md:pt-28">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <p className="eyebrow mb-3">Your Favorites</p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Saved stays
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {favorites.length} {favorites.length === 1 ? 'stay' : 'stays'} saved
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10">
        {favorites.length > 0 ? (
          <div className="border border-border bg-secondary p-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-accent" strokeWidth={1} />
            <h2 className="mt-6 font-serif text-2xl font-light text-foreground">Your saved stays</h2>
            <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
              You have {favorites.length} {favorites.length === 1 ? 'stay' : 'stays'} saved. Search for live availability to check current rates and book.
            </p>
            <Link
              to="/stays"
              className="mt-6 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
              Search stays
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="h-12 w-12 text-border" strokeWidth={1} />
            <h2 className="mt-6 font-serif text-2xl font-light text-foreground">No favorites yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Search for hotels and save them here for later. Availability is always checked live when you're ready to book.
            </p>
            <Link
              to="/stays"
              className="mt-6 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
              Search stays
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
