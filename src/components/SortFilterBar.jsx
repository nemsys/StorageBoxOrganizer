import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Tag, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from '../translations';

const SORT_OPTIONS = [
    { value: 'newest',    tKey: 'sort.newest'   },
    { value: 'oldest',    tKey: 'sort.oldest'   },
    { value: 'name-asc',  tKey: 'sort.nameAsc'  },
    { value: 'name-desc', tKey: 'sort.nameDesc' },
];

export function SortFilterBar({ sortOrder, onSortChange, selectedTag, onTagChange, tags = [] }) {
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

    return (
        <div className="sfb">

            {/* ── Sort pill ── */}
            <div className="sfb__pill-wrap" ref={sortRef}>
                <button
                    onClick={() => { setSortOpen(o => !o); setFilterOpen(false); }}
                    aria-expanded={sortOpen}
                    aria-haspopup="listbox"
                    className={`sfb__pill ${isSortActive ? 'sfb__pill--on' : ''}`}
                >
                    <ArrowUpDown size={13} strokeWidth={2.5} />
                    <span className="sfb__pill-label">{t(currentSort.tKey)}</span>
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
                    className={`sfb__pill ${isFilterActive ? 'sfb__pill--on' : ''}`}
                >
                    <Tag size={13} strokeWidth={2.5} />
                    <span className="sfb__pill-label">{selectedTag || t('tags.all')}</span>
                    {isFilterActive && <span className="sfb__dot" aria-hidden="true" />}
                    <ChevronDown size={13} strokeWidth={2.5}
                        className={`sfb__chevron ${filterOpen ? 'sfb__chevron--open' : ''}`} />
                </button>

                {filterOpen && (
                    <div className="sfb__drop sfb__drop--wide" role="listbox">
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
    );
}
