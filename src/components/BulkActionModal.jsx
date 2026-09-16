import { useState } from 'react';
import { Modal } from './Modal';
import { Package, Check } from 'lucide-react';
import { TagInput } from './TagInput';
import { parseTagInput } from '../utils/tagUtils';
import { useTranslation } from '../translations';

/**
 * What to do with the items currently selected: put them somewhere, or tag them.
 *
 * One component for both because they are the same shape — a count, one choice,
 * one confirm — and because the two used to be the same twenty taps.
 *
 * `mode` is 'move' | 'tag' | null (closed).
 */
export function BulkActionModal({ mode, count, boxes = [], availableTags = [], onClose, onMove, onTag }) {
    const { t } = useTranslation();
    // No reset effect: App gives this a `key` of the current mode, so opening
    // it is a fresh mount and these defaults are the reset.
    const [boxId, setBoxId] = useState('');
    const [tags, setTags] = useState('');

    const submit = (e) => {
        e.preventDefault();
        if (mode === 'move') {
            onMove(boxId);
        } else {
            const parsed = parseTagInput(tags);
            if (parsed.length === 0) return;
            onTag(parsed);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={!!mode}
            onClose={onClose}
            title={mode === 'tag' ? t('select.tagTitle') : t('select.moveTitle')}
        >
            <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-muted">
                    {mode === 'tag'
                        ? t('select.tagIntro', { count })
                        : t('select.moveIntro', { count })}
                </p>

                {mode === 'move' ? (
                    <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1" role="listbox">
                        {/* "No box" is a real destination, not an absence: taking
                            things back out of a box is as ordinary as putting
                            them in, and it is how the unfiled list gets used. */}
                        <button
                            type="button"
                            role="option"
                            aria-selected={boxId === ''}
                            onClick={() => setBoxId('')}
                            className={`picker-row ${boxId === '' ? 'picker-row--on' : ''}`}
                        >
                            <span className="picker-row__thumb flex items-center justify-center text-muted">
                                <Package size={18} />
                            </span>
                            <span className="flex-1 min-w-0 text-sm font-medium text-content truncate text-left">
                                {t('box.unassignedOption')}
                            </span>
                            {boxId === '' && <Check size={18} className="shrink-0 text-primary" />}
                        </button>

                        {boxes.map(box => (
                            <button
                                key={box.id}
                                type="button"
                                role="option"
                                aria-selected={boxId === box.id}
                                onClick={() => setBoxId(box.id)}
                                className={`picker-row ${boxId === box.id ? 'picker-row--on' : ''}`}
                            >
                                {box.image ? (
                                    <img src={box.image} alt="" className="picker-row__thumb" />
                                ) : (
                                    <span className="picker-row__thumb flex items-center justify-center text-muted">
                                        <Package size={18} />
                                    </span>
                                )}
                                <span className="flex-1 min-w-0 text-left">
                                    <span className="block text-sm font-medium text-content truncate">{box.name}</span>
                                    {box.location && (
                                        <span className="block text-xs text-muted truncate">{box.location}</span>
                                    )}
                                </span>
                                {boxId === box.id && <Check size={18} className="shrink-0 text-primary" />}
                            </button>
                        ))}
                    </div>
                ) : (
                    <TagInput
                        value={tags}
                        onChange={setTags}
                        suggestions={availableTags}
                        placeholder={t('item.tagsPlaceholder')}
                        hint={{ remove: (tag) => t('tags.remove', { tag }) }}
                    />
                )}

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary">
                        {mode === 'tag' ? t('select.tagApply') : t('select.moveApply')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
