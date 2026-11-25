import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      closeDisabled={loading}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <div className="w-9 h-9 rounded-md bg-[#fdf1f1] border border-[#f4c5c5] flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-[#991b1b]" />
            </div>
          )}
          <p className="text-sm text-ink-muted leading-relaxed prose-measure">
            {message}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={variant === "danger" ? "btn-danger" : "btn-primary"}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
