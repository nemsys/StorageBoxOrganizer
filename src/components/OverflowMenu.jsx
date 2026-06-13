import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical } from 'lucide-react';

/**
 * Reusable "⋮" overflow menu.
 *
 * The dropdown renders in a portal with fixed positioning so it is never
 * clipped by an `overflow: hidden` ancestor (e.g. the `.card` container).
 *
 * @param {Array} items - [{ id, label, icon, onClick, danger, isDivider }]
 * @param {'right'|'left'} [align='right'] - which edge the dropdown aligns to
 * @param {string} [label='More actions'] - accessible label for the trigger
 * @param {string} [buttonClassName] - override for the trigger button styles
 */
export const OverflowMenu = ({ items = [], align = 'right', label = 'More actions', buttonClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 8, left: r.left, right: window.innerWidth - r.right });
  };

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen]);

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
  }, [isOpen]);

  const run = (item) => (e) => {
    e.stopPropagation();
    setIsOpen(false);
    item.onClick?.(e);
  };

  const positionStyle = align === 'right'
    ? { top: coords.top, right: coords.right }
    : { top: coords.top, left: coords.left };

  return (
    <div ref={triggerRef} style={{ display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        className={buttonClassName || 'p-2.5 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95'}
        title={label}
        aria-label={label}
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
              style={{ position: 'fixed', zIndex: 1000, ...positionStyle }}
              className="w-52 py-2 bg-slate-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              {items.map((item) => (
                item.isDivider ? (
                  <div key={item.id} className="border-b border-white/5 my-1" />
                ) : (
                  <button
                    key={item.id}
                    onClick={run(item)}
                    role="menuitem"
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left group ${
                      item.danger
                        ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className={item.danger ? 'text-red-400' : 'text-slate-500 group-hover:text-primary transition-colors'}>
                      {item.icon}
                    </span>
                    <span className="whitespace-nowrap font-medium">{item.label}</span>
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
