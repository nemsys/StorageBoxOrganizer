import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { Printer, Check, MapPin, Package } from 'lucide-react';
import { useTranslation } from '../translations';
import { boxUrl } from '../utils/boxLinks';

/**
 * Labels to stick on the actual boxes.
 *
 * This is the half of the product that lives in the room rather than on the
 * phone: a photographed inventory still ends with someone reading the sides of
 * eleven boxes. A label carries the box's own name and location — no invented
 * code, because the name is the identifier the user already chose and "A-07"
 * would be one more thing to keep in sync — plus a QR of the `#box/<id>` deep
 * link, so pointing a camera at the box opens it.
 *
 * Printing is done by hiding the rest of the page in `@media print` rather than
 * opening a popup window, which phones block and desktops bury.
 */
export function LabelSheetModal({ isOpen, onClose, boxes = [] }) {
    const { t } = useTranslation();
    // Start with everything ticked: printing the lot is the common case, and
    // un-ticking three is less work than ticking twenty. App remounts this on
    // open (via `key`), so the initialiser is the reset.
    const [chosen, setChosen] = useState(() => new Set(boxes.map(b => b.id)));
    const [codes, setCodes] = useState({});

    const selected = useMemo(() => boxes.filter(b => chosen.has(b.id)), [boxes, chosen]);

    // Render each QR once, to a data URL. High error correction: these get
    // stuck on cardboard, scuffed, and read at an angle in a cellar.
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            const next = {};
            for (const box of selected) {
                try {
                    next[box.id] = await QRCode.toDataURL(boxUrl(box.id), {
                        errorCorrectionLevel: 'H',
                        margin: 1,
                        width: 320,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                } catch (err) {
                    console.error('Could not draw a QR code', err);
                }
            }
            if (!cancelled) setCodes(next);
        })();
        return () => { cancelled = true; };
    }, [isOpen, selected]);

    const toggle = (id) => setChosen(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const ready = selected.length > 0 && selected.every(b => codes[b.id]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('labels.title')}>
                <div className="space-y-4">
                    <p className="text-sm text-muted">{t('labels.intro')}</p>

                    <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1" role="listbox" aria-multiselectable="true">
                        {boxes.map(box => {
                            const on = chosen.has(box.id);
                            return (
                                <button
                                    key={box.id}
                                    type="button"
                                    role="option"
                                    aria-selected={on}
                                    onClick={() => toggle(box.id)}
                                    className={`picker-row ${on ? 'picker-row--on' : ''}`}
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
                                    {on && <Check size={18} className="shrink-0 text-primary" />}
                                </button>
                            );
                        })}
                        {boxes.length === 0 && (
                            <p className="text-sm text-muted py-6 text-center">{t('labels.noBoxes')}</p>
                        )}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                        <span className="mr-auto text-xs text-muted">
                            {t('labels.chosen', { count: selected.length })}
                        </span>
                        <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            disabled={!ready}
                            className="btn btn-primary"
                        >
                            <Printer size={16} />
                            {t('labels.print')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* The sheet itself. Off-screen on screen, the only thing visible on
                paper — see the @media print block in index.css. */}
            {isOpen && (
                <div className="label-sheet" aria-hidden="true">
                    {selected.map(box => (
                        <div key={box.id} className="label">
                            {codes[box.id] && <img className="label__qr" src={codes[box.id]} alt="" />}
                            <div className="label__text">
                                <p className="label__name">{box.name}</p>
                                {box.location && (
                                    <p className="label__place">
                                        <MapPin size={11} /> {box.location}
                                    </p>
                                )}
                                <p className="label__hint">{t('labels.scanHint')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
