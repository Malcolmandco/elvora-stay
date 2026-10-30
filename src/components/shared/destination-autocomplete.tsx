import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DestinationSuggestion } from '@/types/hotel-search';

interface DestinationAutocompleteProps {
  value: string;
  selectedSuggestion: DestinationSuggestion | null;
  onSelect: (suggestion: DestinationSuggestion | null) => void;
  onTextChange: (text: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function DestinationAutocomplete({
  value,
  selectedSuggestion,
  onSelect,
  onTextChange,
  placeholder = 'City, hotel, or destination',
  className,
  label = 'Where',
}: DestinationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hotelbeds-destinations?query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Failed');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setOpen(true);
      setHighlightIndex(-1);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(true);
      setSuggestions([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== (selectedSuggestion?.displayName ?? '') && value.trim().length >= 2) {
        fetchSuggestions(value);
      } else if (value.trim().length < 2) {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, selectedSuggestion, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: DestinationSuggestion) => {
    onTextChange(suggestion.displayName);
    onSelect(suggestion);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        handleSelect(suggestions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  const handleInputChange = (text: string) => {
    onTextChange(text);
    if (selectedSuggestion) {
      onSelect(null);
    }
  };

  const handleClear = () => {
    onTextChange('');
    onSelect(null);
    setSuggestions([]);
    setOpen(false);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    if (value.trim().length >= 2 && suggestions.length > 0) {
      setOpen(true);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <label className="mb-1 flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        <MapPin className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls="destination-listbox"
          aria-autocomplete="list"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear destination"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {open && (
        <div
          id="destination-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto border border-border bg-background shadow-lg"
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              Searching destinations...
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Destination search is currently unavailable.
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && value.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No destinations found for "{value}"
            </div>
          )}

          {!loading && !error && suggestions.map((suggestion, idx) => (
            <button
              key={`${suggestion.destinationCode}-${idx}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                highlightIndex === idx
                  ? 'bg-secondary text-foreground'
                  : 'text-foreground hover:bg-secondary'
              )}
              role="option"
              aria-selected={highlightIndex === idx}
            >
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{suggestion.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {suggestion.country}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
