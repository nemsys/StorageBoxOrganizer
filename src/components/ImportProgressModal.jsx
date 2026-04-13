import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, UploadCloud, CheckCircle2, Package, Boxes } from 'lucide-react';

export const ImportProgressModal = ({ isOpen, progress, phase, current, total }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
            
            <div className="flex flex-col items-center text-center gap-6 mt-2">
              {/* Icon Animation */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  {progress < 100 ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <UploadCloud size={32} className="text-primary" />
                    </motion.div>
                  ) : (
                    <CheckCircle2 size={32} className="text-green-400" />
                  )}
                </div>
                {progress < 100 && (
                  <div className="absolute -top-1 -right-1">
                    <Loader2 size={24} className="text-primary animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-2 w-full">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {progress < 100 ? 'Importing Your Data' : 'Import Complete'}
                </h3>
                <p className="text-slate-400 text-sm font-medium">
                  {phase}
                </p>
              </div>

              {/* Progress Section */}
              <div className="w-full space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Overall Progress
                  </span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {progress}%
                  </span>
                </div>
                
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]"
                  />
                </div>

                <div className="flex justify-center items-center gap-4 pt-2">
                   <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                      <Boxes size={14} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-300">
                        {current} of {total} items
                      </span>
                   </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic mt-2">
                Please do not close your browser until the process is finished.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
