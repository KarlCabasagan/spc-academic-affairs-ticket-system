import { getStatusMeta } from "../../lib/ticketStatus";

const DOT_TONES = {
  pending: "bg-amber-600",
  approved: "bg-emerald-700",
  disapproved: "bg-red-700",
  recommended: "bg-blue-700",
  neutral: "bg-stone-500",
};

const BADGE_CLASSES = {
  pending: "badge-pending",
  approved: "badge-approved",
  disapproved: "badge-disapproved",
  recommended: "badge-recommended",
  neutral: "badge",
};

const StatusBadge = ({ status, variant = "short", className = "" }) => {
  const meta = getStatusMeta(status);
  const badgeClass = BADGE_CLASSES[meta.tone] || BADGE_CLASSES.neutral;
  const dotClass = DOT_TONES[meta.tone] || DOT_TONES.neutral;

  return (
    <span className={`${badgeClass} ${className}`}>
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}
      />
      <span>{variant === "full" ? meta.label : meta.shortLabel}</span>
    </span>
  );
};

export default StatusBadge;
