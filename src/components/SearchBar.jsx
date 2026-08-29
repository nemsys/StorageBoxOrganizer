import { Search, X } from 'lucide-react';

/**
 * The search field. `compact` is the variant that lives in the sticky find bar
 * next to the sort and filter pills; the default is the roomier standalone one.
 */
export function SearchBar({ value, onChange, placeholder = '', compact = false, clearLabel }) {
    return (
        <div className={`relative w-full ${compact ? '' : 'max-w-md'}`}>
            <div className={`absolute inset-y-0 left-0 flex items-center pointer-events-none text-muted ${compact ? 'pl-2.5' : 'pl-3'}`}>
                <Search size={compact ? 16 : 18} />
            </div>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                /* The clear button's room is only reserved while there is
                   something to clear — at 360px those 2rem are the difference
                   between a readable placeholder and a clipped one. */
                className={`input ${compact ? 'input--compact pl-8 bg-surface/60' : 'pl-10 bg-surface/50 border-border focus:bg-surface'} ${value ? (compact ? 'pr-8' : 'pr-10') : 'pr-3'}`}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className={`absolute inset-y-0 right-0 flex items-center text-muted hover:text-content ${compact ? 'pr-2.5' : 'pr-3'}`}
                    aria-label={clearLabel}
                >
                    <X size={compact ? 16 : 18} />
                </button>
            )}
        </div>
    );
}
