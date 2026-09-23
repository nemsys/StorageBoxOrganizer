import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { useTranslation } from '../translations';

/**
 * Reusable "⋮" overflow menu.
 *
 * The dropdown renders in a portal with fixed positioning so it is never
 * clipped by an `overflow: hidden` ancestor (e.g. the `.card` container).
 *
 * @param {Array} items - [{ id, label, icon, onClick, danger, isDivider }]
 * @param {'right'|'left'} [align='right'] - which edge the dropdown aligns to
 * @param {string} [label] - accessible label for the trigger (defaults to a generic one)
 * @param {string} [buttonClassName] - override for the trigger button styles
 */
export const OverflowMenu = ({ items = [], align = 'right', label, buttonClassName }) => {
  const { t } = useTranslation();
  const triggerLabel = label ?? t('common.moreActions');
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = useCallback(() => {
    // Measure the button, not the wrapper: on a card the button is absolutely
    // positioned into the photo's corner while the wrapper stays in the flow.
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Keep the panel off both screen edges: a trigger near either edge would
    // otherwise push long labels (Bulgarian ones are wide) out of sight — a
    // right-aligned menu on a left-column card runs off the left edge. The
    // panel is measured (offsetWidth ignores the open animation's scale) and
    // clamped into the viewport.
    const gutter = 12;
    const width = dropdownRef.current?.offsetWidth ?? 0;
    const preferred = align === 'right' ? r.right - width : r.left;
    setCoords({
      top: r.bottom + 8,
      left: Math.max(gutter, Math.min(preferred, window.innerWidth - gutter - width)),
    });
  }, [align]);

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const reposition = () => updatePosition();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, updatePosition]);

  const run = (item) => (e) => {
    e.stopPropagation();
    setIsOpen(false);
    item.onClick?.(e);
  };

  return (
    <div ref={triggerRef} style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        className={buttonClassName || 'p-2.5 rounded-xl text-muted hover:bg-elevated hover:text-content transition-all hover:scale-105 active:scale-95'}
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={20} className={isOpen ? 'text-primary' : ''} />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              role="menu"
              style={{ position: 'fixed', zIndex: 1000, maxWidth: 'calc(100vw - 24px)', top: coords.top, left: coords.left }}
              className="w-max min-w-52 py-2 bg-base border border-content/25 rounded-xl shadow-2xl overflow-hidden"
            >
              {items.map((item) => (
                item.isDivider ? (
                  <div key={item.id} className="border-b border-content/15 my-1" />
                ) : (
                  <button
                    key={item.id}
                    onClick={run(item)}
                    role="menuitem"
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left group ${
                      item.danger
                        ? 'text-danger hover:text-danger/80 hover:bg-danger/10'
                        : 'text-muted hover:text-content hover:bg-elevated'
                    }`}
                  >
                    <span className={`shrink-0 ${item.danger ? 'text-danger' : 'text-content/50 group-hover:text-primary transition-colors'}`}>
                      {item.icon}
                    </span>
                    <span className="font-medium leading-snug">{item.label}</span>
                  </button>
                )
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
