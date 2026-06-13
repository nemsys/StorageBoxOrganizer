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
      <div>
        <p className="text-slate-300" style={{ lineHeight: 1.6 }}>
          {message}
        </p>

        <div className="flex gap-3" style={{ marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ flex: 1 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
