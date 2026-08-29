import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Tag, ChevronDown, Check } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { useTranslation } from '../translations';

const SORT_OPTIONS = [
    { value: 'newest',    tKey: 'sort.newest'   },
    { value: 'oldest',    tKey: 'sort.oldest'   },
    { value: 'name-asc',  tKey: 'sort.nameAsc'  },
    { value: 'name-desc', tKey: 'sort.nameDesc' },
];

/**
 * The sticky find bar: search, sort, filter.
 *
 * Search lives here rather than in the scrolling content because finding is the
 * product's whole promise — it used to scroll away while the sort control, which
 * you set once and forget, stayed pinned. On a narrow screen the two pills drop
 * their labels so the search field keeps a usable width.
 *
 * `filterTitle` labels the filter dropdown. In the box view the tags belong to
 * *items*, and the filter answers "which boxes contain something tagged X" —
 * a relationship nothing on screen explained before.
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
}) {
    const { t } = useTranslation();
    const [sortOpen,   setSortOpen]   = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const sortRef   = useRef(null);
    const filterRef = useRef(null);

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

    const currentSort    = SORT_OPTIONS.find(o => o.value === sortOrder) ?? SORT_OPTIONS[0];
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
                            {SORT_OPTIONS.map(opt => (
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
                        onClick={() => { setFilterOpen(o => !o); setSortOpen(false); }}
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
                            {filterTitle && <div className="sfb__drop-title">{filterTitle}</div>}
                            <div className="sfb__drop-scroll">
                                <button
                                    role="option"
                                    aria-selected={!selectedTag}
                                    onClick={() => { onTagChange(''); setFilterOpen(false); }}
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
                                        onClick={() => { onTagChange(opt.value); setFilterOpen(false); }}
                                        className={`sfb__drop-item ${selectedTag === opt.value ? 'sfb__drop-item--on' : ''}`}
                                    >
                                        <span className="sfb__drop-item-label">{opt.label}</span>
                                        {selectedTag === opt.value && (
                                            <Check size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                        )}
                                    </button>
                                ))}

                                {tags.length > 0 ? tags.map(tag => (
                                    <button
                                        key={tag}
                                        role="option"
                                        aria-selected={selectedTag === tag}
                                        onClick={() => { onTagChange(tag); setFilterOpen(false); }}
                                        className={`sfb__drop-item ${selectedTag === tag ? 'sfb__drop-item--on' : ''}`}
                                    >
                                        <span className="sfb__drop-item-label">{tag}</span>
                                        {selectedTag === tag && (
                                            <Check size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                        )}
                                    </button>
                                )) : (
                                    <div className="sfb__drop-empty">{t('tags.none')}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
