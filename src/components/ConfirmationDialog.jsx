import { Modal } from './Modal';

export const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel',
  type = 'danger' // 'danger' | 'primary'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-slate-300 text-lg leading-relaxed">
          {message}
        </p>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
              type === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                : 'bg-primary hover:bg-primary-hover shadow-primary/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
