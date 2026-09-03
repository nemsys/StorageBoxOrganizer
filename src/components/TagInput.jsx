import { useRef, useState } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { normalizeTag, parseTagInput } from '../utils/tagUtils';

/**
 * Chip-style tag field with a suggestion ribbon above it.
 *
 * `value` stays the comma-separated string the modals already keep in their
 * drafts, so nothing downstream (draft storage, parseTagInput on submit) had to
 * change — the chips are a view over that string.
 *
 * Enter or a comma commits what is typed; Backspace on an empty field takes the
 * last chip back, which is the behaviour anyone who has used a tag field
 * expects and the plain text input did not have.
 */
export function TagInput({ value, onChange, suggestions = [], placeholder = '', hint }) {
    const [draft, setDraft] = useState('');
    const inputRef = useRef(null);

    const tags = parseTagInput(value);
    const emit = (next) => onChange(next.join(', ') + (next.length ? ', ' : ''));

    const addTag = (raw) => {
        const tag = normalizeTag(raw);
        if (!tag) return;
        if (!tags.includes(tag)) emit([...tags, tag]);
        setDraft('');
    };

    const removeTag = (tag) => emit(tags.filter(existing => existing !== tag));

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(draft);
        } else if (e.key === 'Backspace' && draft === '' && tags.length) {
            e.preventDefault();
            removeTag(tags[tags.length - 1]);
        }
    };

    // Typing narrows the ribbon; with an empty field it shows everything.
    const partial = normalizeTag(draft);
    const visibleSuggestions = suggestions.filter(s => !partial || normalizeTag(s).includes(partial));

    return (
        <div>
            {visibleSuggestions.length > 0 && (
                <div className="tag-ribbon">
                    {visibleSuggestions.map(suggestion => {
                        const isActive = tags.includes(normalizeTag(suggestion));
                        return (
                            <button
                                key={suggestion}
                                type="button"
                                className={`tag-chip ${isActive ? 'active' : ''}`}
                                aria-pressed={isActive}
                                // Keep focus in the field: the default blur would fire
                                // onBlur first, committing the half-typed draft ("кл")
                                // and re-filtering the ribbon out from under the tap.
                                onPointerDown={(e) => e.preventDefault()}
                                onClick={() => (isActive ? removeTag(normalizeTag(suggestion)) : addTag(suggestion))}
                            >
                                {suggestion}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="tag-field" onClick={() => inputRef.current?.focus()}>
                {tags.map(tag => (
                    <span key={tag} className="tag-field__chip">
                        <TagIcon size={11} className="shrink-0" />
                        <span className="tag-field__chip-label">{tag}</span>
                        <button
                            type="button"
                            className="tag-field__remove"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                            aria-label={hint?.remove?.(tag) ?? tag}
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className="tag-field__input"
                    value={draft}
                    onChange={(e) => {
                        // Pasting "a, b, c" commits everything before the last comma.
                        const next = e.target.value;
                        if (next.includes(',')) {
                            const parts = next.split(',');
                            const trailing = parts.pop();
                            const merged = [...tags];
                            parts.forEach(part => {
                                const tag = normalizeTag(part);
                                if (tag && !merged.includes(tag)) merged.push(tag);
                            });
                            emit(merged);
                            setDraft(trailing.trimStart());
                        } else {
                            setDraft(next);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={(e) => {
                        // Belt and braces for browsers that move focus anyway.
                        if (e.relatedTarget?.closest?.('.tag-ribbon')) return;
                        addTag(draft);
                    }}
                    placeholder={tags.length ? '' : placeholder}
                />
            </div>
        </div>
    );
}
