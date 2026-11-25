export const TICKET_STATUSES = [
  {
    value: "Pending",
    label: "Pending",
    shortLabel: "Pending",
    stage: 1,
    tone: "pending",
    description: "Received by OVPAA and awaiting administrative review.",
  },
  {
    value: "Approved and Recommended",
    label: "Approved & Recommended",
    shortLabel: "Recommended",
    stage: 2,
    tone: "recommended",
    description:
      "Endorsed by OVPAA and forwarded for final approval or routing.",
  },
  {
    value: "Disapproved and revised",
    label: "Disapproved & Revised",
    shortLabel: "Disapproved",
    stage: 2,
    tone: "disapproved",
    description:
      "Returned with remarks requiring revision before resubmission.",
  },
  {
    value: "Approved and released",
    label: "Approved & Released",
    shortLabel: "Released",
    stage: 3,
    tone: "approved",
    description:
      "Finalized and released to the designated recipient or office.",
  },
];

export const STATUS_MAP = Object.fromEntries(
  TICKET_STATUSES.map((item) => [item.value, item]),
);

/**
 * Look up display metadata for a ticket status enum value.
 */
export const getStatusMeta = (status) => {
  if (status && STATUS_MAP[status]) {
    return STATUS_MAP[status];
  }

  return {
    value: status || "Unknown",
    label: status || "Unknown",
    shortLabel: status || "Unknown",
    stage: 1,
    tone: "neutral",
    description: "",
  };
};

/**
 * Normalize user-entered or pasted ticket codes without duplicating the SPC- prefix.
 */
export const normalizeTicketCode = (raw) => {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  // Strip one or more accidental SPC- or SPC prefixes before normalizing the code suffix.
  const withoutPrefix = cleaned.replace(/^(SPC-?)+/i, "");
  const suffix = withoutPrefix.replace(/[^A-Z0-9]/g, "");
  const fullCode = suffix ? `SPC-${suffix}` : "";

  return {
    fullCode,
    suffix,
    isValid: suffix.length >= 3,
  };
};
