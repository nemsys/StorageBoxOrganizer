import { motion } from 'framer-motion';
import { PackageOpen, Tag, Trash2, X, CheckCheck } from 'lucide-react';
import { useTranslation } from '../translations';

/**
 * The bar that replaces the FAB while items are being selected.
 *
 * It sits at the bottom, where the thumb already is, and states the count
 * first — the one thing you need to trust before pressing anything here. The
 * destructive action is last and tinted, so it is not adjacent to "move".
 */
export function SelectionBar({ count, total, onSelectAll, onMove, onTag, onDelete, onCancel }) {
    const { t } = useTranslation();
    const disabled = count === 0;

    return (
        <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="selection-bar"
            role="toolbar"
            aria-label={t('select.toolbar')}
        >
            <div className="selection-bar__inner">
                <button
                    type="button"
                    onClick={onCancel}
                    className="selection-bar__btn"
                    aria-label={t('common.cancel')}
                    title={t('common.cancel')}
                >
                    <X size={20} />
                </button>

                <span className="selection-bar__count" aria-live="polite">
                    {t('select.count', { count })}
                </span>

                <button
                    type="button"
                    onClick={onSelectAll}
                    className="selection-bar__btn"
                    aria-label={t('select.all')}
                    title={t('select.all')}
                    disabled={count === total}
                >
                    <CheckCheck size={20} />
                </button>

                <span className="selection-bar__divider" aria-hidden="true" />

                <button
                    type="button"
                    onClick={onMove}
                    disabled={disabled}
                    className="selection-bar__btn"
                    aria-label={t('select.move')}
                    title={t('select.move')}
                >
                    <PackageOpen size={20} />
                </button>
                <button
                    type="button"
                    onClick={onTag}
                    disabled={disabled}
                    className="selection-bar__btn"
                    aria-label={t('select.tag')}
                    title={t('select.tag')}
                >
                    <Tag size={20} />
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={disabled}
                    className="selection-bar__btn selection-bar__btn--danger"
                    aria-label={t('select.delete')}
                    title={t('select.delete')}
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </motion.div>
    );
}
