import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../native/backHandler';
import { useScrollLock } from '../hooks/useScrollLock';
import { useTranslation } from '../translations';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children }) {
    const { t } = useTranslation();
    const panelRef = useRef(null);
    const restoreFocusTo = useRef(null);

    // Android hardware back closes the modal (mirrors Escape / the X button).
    useBackHandler(isOpen, onClose);
    // Reference-counted, so a nested viewer closing does not unlock the page
    // while this modal is still open.
    useScrollLock(isOpen);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Move focus into the dialog on open and hand it back on close, and keep Tab
    // inside while it is up — otherwise a keyboard user tabs into the page
    // behind an open modal with no way of telling where they are.
    useEffect(() => {
        if (!isOpen) return;
        restoreFocusTo.current = document.activeElement;

        const panel = panelRef.current;
        const first = panel?.querySelector(FOCUSABLE);
        (first ?? panel)?.focus();

        const handleTab = (e) => {
            if (e.key !== 'Tab' || !panel) return;
            const focusable = Array.from(panel.querySelectorAll(FOCUSABLE))
                .filter(el => el.offsetParent !== null);
            if (focusable.length === 0) return;

            const firstEl = focusable[0];
            const lastEl = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        };

        document.addEventListener('keydown', handleTab);
        return () => {
            document.removeEventListener('keydown', handleTab);
            const target = restoreFocusTo.current;
            if (target && typeof target.focus === 'function') target.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
            style={{ overflow: 'hidden' }}
            onClick={(e) => {
                // Only close if clicking the backdrop, not the modal content
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                tabIndex={-1}
                className="glass-panel w-full max-w-md rounded-xl shadow-2xl animate-fade-in"
                style={{
                    animationDuration: '0.2s',
                    maxHeight: 'calc(100dvh - 2rem)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Fixed */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border" style={{ flexShrink: 0 }}>
                    <h2 className="text-lg font-semibold text-content">{title}</h2>
                    <button
                        onClick={onClose}
                        className="btn-icon btn-ghost text-muted hover:text-content"
                        aria-label={t('common.close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div
                    style={{
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        flex: '1 1 auto',
                        minHeight: 0,
                        overscrollBehavior: 'contain',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-y'
                    }}
                >
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
