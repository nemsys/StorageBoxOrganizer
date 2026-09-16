import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from '../translations';

/**
 * Where a box physically is — "таван", "мазе, рафт 2".
 *
 * Free text rather than a managed list of places: a storage location is not a
 * taxonomy anyone wants to set up before packing the first box, and half of
 * them are only ever used once. The `<datalist>` does the work a taxonomy would
 * have done — every place already in use is offered as you type, so the second
 * box on the same shelf gets the same spelling as the first, which is all that
 * grouping by location actually needs.
 *
 * A native datalist and not a custom dropdown: it is one tap on Android, it
 * never covers the keyboard, and it stays a plain text field when the place is
 * genuinely new.
 */
export function LocationInput({ value, onChange, suggestions = [] }) {
    const { t } = useTranslation();
    const listId = useId();

    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <label htmlFor={`${listId}-input`} className="block text-sm font-medium text-muted">
                    {t('box.location')}
                </label>
                <span className="text-[10px] text-muted uppercase tracking-wider">
                    {t('common.optional')}
                </span>
            </div>
            <div className="relative">
                <MapPin
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                    aria-hidden="true"
                />
                <input
                    id={`${listId}-input`}
                    type="text"
                    list={suggestions.length > 0 ? listId : undefined}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="input pl-9"
                    placeholder={t('box.locationPlaceholder')}
                    autoComplete="off"
                />
            </div>
            {suggestions.length > 0 && (
                <datalist id={listId}>
                    {suggestions.map(place => <option key={place} value={place} />)}
                </datalist>
            )}
            <p className="text-xs text-muted mt-1">{t('box.locationHint')}</p>
        </div>
    );
}
