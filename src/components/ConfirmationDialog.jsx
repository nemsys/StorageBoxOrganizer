import { Modal } from './Modal';
import { useTranslation } from '../translations';

export const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  confirmLabel,
  cancelLabel,
  type = 'danger' // 'danger' | 'primary'
}) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <p className="text-muted" style={{ lineHeight: 1.6 }}>
          {message}
        </p>

        <div className="flex gap-3" style={{ marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ flex: 1 }}
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1 }}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
