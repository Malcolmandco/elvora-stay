import { useState, useRef, useEffect, useCallback } from 'react';
import { Plane, Loader2, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuffelPlace, SelectedPlace, DuffelPlaceAirport } from '@/types/duffel-place';
import { toSelectedPlace, toSelectedAirport } from '@/types/duffel-place';

interface AirportAutocompleteProps {
  label: string;
  placeholder: string;
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
}

export function AirportAutocomplete({ label, placeholder, value, onChange }: AirportAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<DuffelPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (value) {
      setInputValue(value.type === 'airport' ? value.name : value.name);
    } else {
      setInputValue('');
    }
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setExpandedCityId(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    const currentId = ++requestId.current;
    setLoading(true);
    setError(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-suggestions?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (currentId !== requestId.current) return;

      if (!response.ok) {
        setError(true);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      if (currentId !== requestId.current) return;
      setSuggestions(data.data || []);
    } catch {
      if (currentId !== requestId.current) return;
      setError(true);
      setSuggestions([]);
    } finally {
      if (currentId === requestId.current) setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(null);
    setExpandedCityId(null);
    setHighlightIndex(-1);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.trim().length >= 2) {
      setIsOpen(true);
      debounceTimer.current = setTimeout(() => searchPlaces(val.trim()), 300);
    } else {
      setIsOpen(false);
      setSuggestions([]);
      setLoading(false);
    }
  };

  const handleFocus = () => {
    if (inputValue.trim().length >= 2 && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const selectPlace = (place: DuffelPlace) => {
    if (place.type === 'airport') {
      onChange(toSelectedPlace(place));
    } else {
      onChange(toSelectedPlace(place));
    }
    setInputValue(place.name);
    setIsOpen(false);
    setExpandedCityId(null);
    setHighlightIndex(-1);
  };

  const selectAirport = (airport: DuffelPlaceAirport, parentCity: DuffelPlace) => {
    onChange(toSelectedAirport(airport, parentCity));
    setInputValue(airport.name);
    setIsOpen(false);
    setExpandedCityId(null);
    setHighlightIndex(-1);
  };

  const clearField = () => {
    setInputValue('');
    onChange(null);
    setSuggestions([]);
    setIsOpen(false);
    setExpandedCityId(null);
    inputRef.current?.focus();
  };

  const toggleCityExpand = (cityId: string) => {
    setExpandedCityId(expandedCityId === cityId ? null : cityId);
  };

  const flattenedItems = () => {
    const items: { type: 'place'; place: DuffelPlace; index: number }[] | { type: 'airport'; airport: DuffelPlaceAirport; parentCity: DuffelPlace; index: number }[] = [];
    const result: Array<{ type: 'place'; place: DuffelPlace } | { type: 'airport'; airport: DuffelPlaceAirport; parentCity: DuffelPlace }> = [];
    suggestions.forEach((s) => {
      result.push({ type: 'place', place: s });
      if (s.type === 'city' && s.airports && s.airports.length > 0 && expandedCityId === s.id) {
        s.airports.forEach((a) => result.push({ type: 'airport', airport: a, parentCity: s }));
      }
    });
    return result;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const items = flattenedItems();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < items.length) {
        const item = items[highlightIndex];
        if (item.type === 'place') {
          if (item.place.type === 'city' && item.place.airports && item.place.airports.length > 0) {
            toggleCityExpand(item.place.id);
          } else {
            selectPlace(item.place);
          }
        } else {
          selectAirport(item.airport, item.parentCity);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setExpandedCityId(null);
    }
  };

  const items = isOpen ? flattenedItems() : [];

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        <Plane className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearField}
            className="absolute right-0 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label="Clear"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto border border-border bg-card shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-3">
              <span className="text-sm text-muted-foreground">Airport search is temporarily unavailable. Please try again.</span>
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="px-4 py-3">
              <span className="text-sm text-muted-foreground">No airports or cities found</span>
            </div>
          )}

          {!loading && !error && items.map((item, idx) => {
            if (item.type === 'place') {
              const place = item.place;
              const isCity = place.type === 'city';
              const hasAirports = isCity && place.airports && place.airports.length > 0;
              const isExpanded = expandedCityId === place.id;
              const isHighlighted = highlightIndex === idx;

              return (
                <div key={place.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasAirports) {
                        if (!isExpanded) {
                          setExpandedCityId(place.id);
                          setHighlightIndex(idx);
                        } else {
                          selectPlace(place);
                        }
                      } else {
                        selectPlace(place);
                      }
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      isHighlighted ? 'bg-secondary' : 'hover:bg-secondary/50'
                    )}
                  >
                    <span className="mt-0.5 flex-shrink-0">
                      {isCity ? (
                        <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      ) : (
                        <Plane className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {place.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isCity
                          ? `${place.country_name || place.country_code || ''}`
                          : `${place.city_name || ''}${place.city_name ? ', ' : ''}${place.country_name || place.country_code || ''}`}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wider text-accent">
                      {(isCity ? place.iata_city_code : place.iata_code) || ''}
                    </span>
                  </button>
                  {hasAirports && isExpanded && (
                    <div className="border-t border-border/50 bg-secondary/30">
                      <div className="px-4 py-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                        {place.airports!.length} airport{place.airports!.length > 1 ? 's' : ''} in this area
                      </div>
                      {place.airports!.map((airport) => (
                        <button
                          key={airport.id}
                          type="button"
                          onClick={() => selectAirport(airport, place)}
                          onMouseEnter={() => setHighlightIndex(idx + 1 + place.airports!.indexOf(airport))}
                          className={cn(
                            'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                            highlightIndex === idx + 1 + place.airports!.indexOf(airport) ? 'bg-secondary' : 'hover:bg-secondary/50'
                          )}
                        >
                          <span className="mt-0.5 flex-shrink-0">
                            <Plane className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{airport.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {airport.city_name || place.name}, {airport.country_name || airport.country_code || place.country_code}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wider text-accent">
                            {airport.iata_code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
