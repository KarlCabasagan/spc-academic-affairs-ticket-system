import { useEffect } from "react";
import { X } from "lucide-react";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const Modal = ({
  open,
  onClose,
  title,
  description,
  size = "md",
  closeDisabled = false,
  children,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !closeDisabled) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  const titleId = "modal-dialog-title";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-[#171614]/45 backdrop-blur-[2px] animate-fadeIn"
        onClick={() => !closeDisabled && onClose()}
      />
      <div
        className={`relative w-full ${SIZE_CLASSES[size] || SIZE_CLASSES.md} bg-surface border border-border rounded-lg shadow-[var(--shadow-modal)] animate-modal`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
          <div>
            <h2
              id={titleId}
              className="text-base font-semibold text-ink leading-6"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-ink-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            disabled={closeDisabled}
            onClick={onClose}
            aria-label="Close dialog"
            className="icon-btn -mr-2 -mt-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
