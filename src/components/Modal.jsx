import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            style={{ overflow: 'hidden' }}
            onClick={(e) => {
                // Only close if clicking the backdrop, not the modal content
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
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
                <div className="flex items-center justify-between p-4 border-b border-slate-700" style={{ flexShrink: 0 }}>
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                    <button onClick={onClose} className="btn-icon btn-ghost text-slate-400 hover:text-white">
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
