import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Tag, ChevronDown, Check, ListChecks } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { useTranslation } from '../translations';
import { SORT_OPTIONS } from '../utils/sortOptions';
import { normalizeTag } from '../utils/tagUtils';

/** Below this many tags the list fits on screen and a search field is clutter. */
const TAG_SEARCH_THRESHOLD = 8;

/**
 * The sticky find bar: search, sort, filter.
 *
 * Search lives here rather than in the scrolling content because finding is the
 * product's whole promise — it used to scroll away while the sort control, which
 * you set once and forget, stayed pinned. On a narrow screen the two pills drop
 * their labels so the search field keeps a usable width.
 *
 * `filterTitle` is the filter pill's accessible name. It used to be a visible
 * heading inside the dropdown too, but the tag icon already says what the menu
 * is, and the heading pushed the list down.
 *
 * A long tag list gets a search field at its top: scrolling for a tag whose
 * name you already know is slower than typing its first letters.
 */
export function SortFilterBar({
    sortOrder,
    onSortChange,
    selectedTag,
    onTagChange,
    tags = [],
    searchValue,
    onSearchChange,
    searchPlaceholder = '',
    filterTitle,
    specialOptions = [],
    sortOptions = SORT_OPTIONS,
    onToggleSelect,
    isSelecting = false,
}) {
    const { t } = useTranslation();
    const [sortOpen,   setSortOpen]   = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [tagQuery,   setTagQuery]   = useState('');
    const sortRef   = useRef(null);
    const filterRef = useRef(null);
    const tagSearchRef = useRef(null);

    const showTagSearch = tags.length > TAG_SEARCH_THRESHOLD;
    const query = normalizeTag(tagQuery);
    const visibleTags = query ? tags.filter(tag => normalizeTag(tag).includes(query)) : tags;

    // Focus the field only where there is a physical keyboard: on a phone it
    // would pop the on-screen keyboard over the list every time, even when the
    // user just wants to tap a tag.
    useEffect(() => {
        if (filterOpen && showTagSearch && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
            tagSearchRef.current?.focus();
        }
    }, [filterOpen, showTagSearch]);

    const pickTag = (value) => { onTagChange(value); setFilterOpen(false); };

    // Close on outside pointer-down
    useEffect(() => {
        function handle(e) {
            if (sortRef.current   && !sortRef.current.contains(e.target))   setSortOpen(false);
            if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
        }
        document.addEventListener('pointerdown', handle);
        return () => document.removeEventListener('pointerdown', handle);
    }, []);

    // Close on Escape
    useEffect(() => {
        function handle(e) {
            if (e.key === 'Escape') { setSortOpen(false); setFilterOpen(false); }
        }
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, []);

    const currentSort    = sortOptions.find(o => o.value === sortOrder) ?? sortOptions[0];
    const isSortActive   = sortOrder !== 'newest';
    const isFilterActive = !!selectedTag;
    const activeSpecial  = specialOptions.find(o => o.value === selectedTag);
    const filterLabel    = activeSpecial ? activeSpecial.label : (selectedTag || t('tags.all'));

    return (
        <div className="sfb">

            {/* ── Search ── */}
            {onSearchChange && (
                <div className="sfb__search">
                    <SearchBar
                        value={searchValue}
                        onChange={onSearchChange}
                        placeholder={searchPlaceholder}
                        clearLabel={t('search.clear')}
                        compact
                    />
                </div>
            )}

            <div className="sfb__controls">
                {/* ── Select pill ── icon only: it is a mode switch, not a
                    setting, and the row has two labelled pills already. */}
                {onToggleSelect && (
                    <button
                        onClick={onToggleSelect}
                        aria-pressed={isSelecting}
                        aria-label={t('select.start')}
                        title={t('select.start')}
                        className={`sfb__pill sfb__pill--icon ${isSelecting ? 'sfb__pill--on' : ''}`}
                    >
                        <ListChecks size={14} strokeWidth={2.5} />
                    </button>
                )}

                {/* ── Sort pill ── */}
                <div className="sfb__pill-wrap" ref={sortRef}>
                    <button
                        onClick={() => { setSortOpen(o => !o); setFilterOpen(false); }}
                        aria-expanded={sortOpen}
                        aria-haspopup="listbox"
                        aria-label={t('common.sortBy')}
                        className={`sfb__pill ${isSortActive ? 'sfb__pill--on' : ''}`}
                    >
                        <ArrowUpDown size={13} strokeWidth={2.5} />
                        <span className="sfb__pill-label sfb__pill-label--optional">{t(currentSort.tKey)}</span>
                        {isSortActive && <span className="sfb__dot" aria-hidden="true" />}
                        <ChevronDown size={13} strokeWidth={2.5}
                            className={`sfb__chevron ${sortOpen ? 'sfb__chevron--open' : ''}`} />
                    </button>

                    {sortOpen && (
                        <div className="sfb__drop" role="listbox">
                            {sortOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    role="option"
                                    aria-selected={sortOrder === opt.value}
                                    onClick={() => { onSortChange(opt.value); setSortOpen(false); }}
                                    className={`sfb__drop-item ${sortOrder === opt.value ? 'sfb__drop-item--on' : ''}`}
                                >
                                    {t(opt.tKey)}
                                    {sortOrder === opt.value && <Check size={14} strokeWidth={2.5} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Filter / Tag pill ── */}
                <div className="sfb__pill-wrap" ref={filterRef}>
                    <button
                        onClick={() => { setTagQuery(''); setFilterOpen(o => !o); setSortOpen(false); }}
                        aria-expanded={filterOpen}
                        aria-haspopup="listbox"
                        aria-label={filterTitle || t('tags.all')}
                        className={`sfb__pill ${isFilterActive ? 'sfb__pill--on' : ''}`}
                    >
                        <Tag size={13} strokeWidth={2.5} />
                        <span className={`sfb__pill-label ${isFilterActive ? '' : 'sfb__pill-label--optional'}`}>
                            {filterLabel}
                        </span>
                        {isFilterActive && <span className="sfb__dot" aria-hidden="true" />}
                        <ChevronDown size={13} strokeWidth={2.5}
                            className={`sfb__chevron ${filterOpen ? 'sfb__chevron--open' : ''}`} />
                    </button>

                    {filterOpen && (
                        <div className="sfb__drop sfb__drop--wide" role="listbox"
                            style={{ left: 'auto', right: 0, transformOrigin: 'top right' }}>
                            {showTagSearch && (
                                <div className="sfb__drop-search">
                                    <input
                                        ref={tagSearchRef}
                                        type="search"
                                        value={tagQuery}
                                        onChange={e => setTagQuery(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && query && visibleTags.length > 0) {
                                                e.preventDefault();
                                                pickTag(visibleTags[0]);
                                            }
                                        }}
                                        placeholder={t('tags.filterSearch')}
                                        aria-label={t('tags.filterSearch')}
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        enterKeyHint="go"
                                    />
                                </div>
                            )}
                            <div className="sfb__drop-scroll">
                                <button
                                    role="option"
                                    aria-selected={!selectedTag}
                                    onClick={() => pickTag('')}
                                    className={`sfb__drop-item ${!selectedTag ? 'sfb__drop-item--on' : ''}`}
                                >
                                    {t('tags.all')}
                                    {!selectedTag && <Check size={14} strokeWidth={2.5} />}
                                </button>

                                {specialOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        role="option"
                                        aria-selected={selectedTag === opt.value}
                                        onClick={() => pickTag(opt.value)}
                                        className={`sfb__drop-item ${selectedTag === opt.value ? 'sfb__drop-item--on' : ''}`}
                                    >
                                        <span className="sfb__drop-item-label">{opt.label}</span>
                                        {selectedTag === opt.value && (
                                            <Check size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                        )}
                                    </button>
                                ))}

                                {visibleTags.length > 0 ? visibleTags.map(tag => (
                                    <button
                                        key={tag}
                                        role="option"
                                        aria-selected={selectedTag === tag}
                                        onClick={() => pickTag(tag)}
                                        className={`sfb__drop-item ${selectedTag === tag ? 'sfb__drop-item--on' : ''}`}
                                    >
                                        <span className="sfb__drop-item-label">{tag}</span>
                                        {selectedTag === tag && (
                                            <Check size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                        )}
                                    </button>
                                )) : (
                                    <div className="sfb__drop-empty">
                                        {tags.length > 0 ? t('tags.filterNoMatch') : t('tags.none')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
