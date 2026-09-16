import { useMemo } from 'react';
import { Modal } from './Modal';
import { PackageOpen, MapPin, Tag, Package, Camera, CheckCircle2, ChevronRight } from 'lucide-react';
import { getImageRefs } from '../utils/imageUtils';
import { normalizeTags } from '../utils/tagUtils';
import { useTranslation } from '../translations';

/**
 * The inventory's own to-do list.
 *
 * Every entry here is something that will make a search fail *later*: an item
 * nobody filed, a box whose location nobody recorded, a thing with no tags and
 * no photo. None of it is an error, so nothing in the app ever mentions it, and
 * an inventory decays exactly this quietly.
 *
 * Each row opens the thing that needs fixing rather than merely counting it —
 * a list of problems you cannot act on is a worse version of no list at all.
 */
export function InventoryCheckModal({
    isOpen,
    onClose,
    boxes = [],
    allItems = [],
    itemCounts,
    onEditBox,
    onEditItem,
}) {
    const { t } = useTranslation();

    const groups = useMemo(() => {
        if (!isOpen) return [];
        const count = (id) => itemCounts?.get(id) || 0;

        return [
            {
                id: 'unfiled-items',
                icon: <PackageOpen size={16} />,
                label: t('check.unfiledItems'),
                entries: allItems.filter(i => !i.boxId),
                open: onEditItem,
            },
            {
                id: 'boxes-without-location',
                icon: <MapPin size={16} />,
                label: t('check.boxesWithoutLocation'),
                entries: boxes.filter(b => !(b.location || '').trim()),
                open: onEditBox,
            },
            {
                id: 'untagged-items',
                icon: <Tag size={16} />,
                label: t('check.untaggedItems'),
                entries: allItems.filter(i => normalizeTags(i.tags).length === 0),
                open: onEditItem,
            },
            {
                id: 'empty-boxes',
                icon: <Package size={16} />,
                label: t('check.emptyBoxes'),
                entries: boxes.filter(b => count(b.id) === 0),
                open: onEditBox,
            },
            {
                id: 'without-photo',
                icon: <Camera size={16} />,
                label: t('check.withoutPhoto'),
                entries: [
                    ...boxes.filter(b => getImageRefs(b).length === 0),
                    ...allItems.filter(i => getImageRefs(i).length === 0),
                ],
                open: (entity) => (('boxId' in entity) ? onEditItem(entity) : onEditBox(entity)),
            },
        ].filter(group => group.entries.length > 0);
    }, [isOpen, boxes, allItems, itemCounts, onEditBox, onEditItem, t]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('check.title')}>
            {groups.length === 0 ? (
                <div className="py-8 text-center">
                    <span className="inline-flex text-success mb-3"><CheckCircle2 size={36} /></span>
                    <p className="text-content font-semibold">{t('check.allClearTitle')}</p>
                    <p className="text-muted text-sm mt-1">{t('check.allClearHint')}</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <p className="text-sm text-muted">{t('check.intro')}</p>

                    {groups.map(group => (
                        <section key={group.id}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-content mb-2">
                                <span className="text-primary">{group.icon}</span>
                                <span className="flex-1 min-w-0">{group.label}</span>
                                <span className="tag-count shrink-0">{group.entries.length}</span>
                            </h3>
                            <div className="space-y-1">
                                {group.entries.map(entity => (
                                    <button
                                        key={`${group.id}-${entity.id}`}
                                        type="button"
                                        onClick={() => { group.open(entity); onClose(); }}
                                        className="picker-row w-full"
                                    >
                                        <span className="flex-1 min-w-0 text-sm font-medium text-content truncate text-left">
                                            {entity.name}
                                        </span>
                                        <ChevronRight size={16} className="shrink-0 text-muted" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <div className="pt-5 flex justify-end">
                <button type="button" onClick={onClose} className="btn btn-primary">{t('common.done')}</button>
            </div>
        </Modal>
    );
}
