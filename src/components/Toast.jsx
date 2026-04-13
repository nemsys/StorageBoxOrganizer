import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

export const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration === Infinity) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-green-400" size={18} />,
    error: <AlertCircle className="text-red-400" size={18} />,
    info: <Info className="text-primary" size={18} />
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl min-w-[280px] max-w-[90vw]"
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-sm text-white font-medium flex-1">{message}</p>
      <button 
        onClick={onClose}
        className="shrink-0 text-slate-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};
