const pad2 = (num) => String(num).padStart(2, "0");

/**
 * Format a Date (default now) as YYYY-MM-DD in the user's local timezone.
 */
export const toLocalDateInputValue = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Format a Date (default now) as YYYY-MM-DDTHH:mm in the user's local timezone.
 */
export const toLocalDateTimeInputValue = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${toLocalDateInputValue(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * Convert a local datetime-local input value into a UTC ISO string.
 */
export const localDateTimeToISO = (localDateTimeStr) => {
  if (!localDateTimeStr) return new Date().toISOString();
  const parsed = new Date(localDateTimeStr);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

/**
 * Convert local YYYY-MM-DD start and end dates into inclusive UTC ISO bounds.
 */
export const localDateRangeToISO = (startDateStr, endDateStr) => {
  const [sy, sm, sd] = String(startDateStr).split("-").map(Number);
  const [ey, em, ed] = String(endDateStr).split("-").map(Number);

  const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
};

/**
 * Format an ISO timestamp with full date and time.
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format an ISO timestamp as compact date and time.
 */
export const formatShortDateTime = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format an ISO timestamp as compact date only.
 */
export const formatShortDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Build a sortable YYYY-MM key in the user's local timezone.
 */
export const formatMonthKey = (dateString) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

/**
 * Build a human-readable month label such as "September 2026".
 */
export const formatMonthLabel = (dateString) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/**
 * Build a unique, Excel-safe (<= 31 chars) worksheet name such as "Sep 2026".
 */
export const formatExcelSheetName = (dateString) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
