import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from '../translations';

/**
 * Toasts sit at the top of the screen. They used to sit at the bottom centre,
 * directly on top of the floating add button — so the one moment you are most
 * likely to add another item ("Item added") was the one moment you could not
 * reach the button.
 */
export const Toast = ({ message, type = 'info', onClose, duration = 3000, actionLabel, onAction }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (duration === Infinity) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-success" size={18} />,
    error: <AlertCircle className="text-danger" size={18} />,
    info: <Info className="text-primary" size={18} />
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-base border border-content/25 rounded-xl shadow-2xl min-w-[280px] max-w-[90vw]"
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-sm text-content font-medium flex-1">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="shrink-0 flex items-center gap-1 px-2 py-1 -my-1 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Undo2 size={14} />
          {actionLabel}
        </button>
      )}
      <button
        onClick={onClose}
        className="shrink-0 text-muted hover:text-content transition-colors"
        aria-label={t('common.close')}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};
