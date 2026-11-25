import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, X, Clock } from "lucide-react";
import { TICKET_STATUSES, normalizeTicketCode } from "../../lib/ticketStatus";
import StatusBadge from "../../components/ui/StatusBadge";

const RECENT_TICKETS_KEY = "spc_recent_tickets";

const readRecentTickets = () => {
  try {
    const raw = localStorage.getItem(RECENT_TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
};

const LandingPage = () => {
  const [codeSuffix, setCodeSuffix] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recentTickets, setRecentTickets] = useState(() => readRecentTickets());
  const navigate = useNavigate();

  const handleCodeChange = (e) => {
    const raw = e.target.value;
    setValidationError("");

    const cleaned = raw
      .toUpperCase()
      .replace(/^(SPC-?)+/i, "")
      .replace(/[^A-Z0-9]/g, "");
    setCodeSuffix(cleaned);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const { fullCode, isValid } = normalizeTicketCode(codeSuffix);

    if (!isValid) {
      setValidationError(
        "Enter at least 3 characters after SPC- (for example, 8X92).",
      );
      return;
    }

    setValidationError("");
    navigate(`/track/${fullCode}`);
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_TICKETS_KEY);
    } catch {
      // Ignore storage errors
    }
    setRecentTickets([]);
  };

  return (
    <div className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Primary Tracking Console */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-ink tracking-[-0.025em] leading-[1.12]">
                Academic Affairs Document Tracker
              </h1>
              <p className="text-base text-ink-muted leading-relaxed max-w-[52ch]">
                Verify the live processing status, routing office, and release
                details of your St. Peter&apos;s College OVPAA document request.
              </p>
            </div>

            {/* Lookup Sheet */}
            <form
              onSubmit={handleSearch}
              className="card p-5 sm:p-6 space-y-4"
              noValidate
            >
              <div>
                <label htmlFor="ticket-code-input" className="label">
                  Document Ticket Code
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div
                    className={`flex flex-1 items-center rounded-md border bg-surface overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-maroon-700 focus-within:ring-3 focus-within:ring-maroon-700/12 ${
                      validationError
                        ? "border-red-600 focus-within:border-red-600 focus-within:ring-red-600/12"
                        : "border-border-strong"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="px-3.5 py-2.5 bg-rail border-r border-border font-mono font-semibold text-sm text-maroon-700 select-none"
                    >
                      SPC-
                    </span>
                    <input
                      id="ticket-code-input"
                      type="text"
                      value={codeSuffix}
                      onChange={handleCodeChange}
                      placeholder="8X92"
                      maxLength={12}
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={Boolean(validationError)}
                      aria-describedby={
                        validationError ? "ticket-code-error" : "ticket-code-help"
                      }
                      className="flex-1 min-w-0 px-3.5 py-2.5 font-mono text-base uppercase text-ink bg-transparent placeholder:text-ink-subtle focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="btn-primary sm:px-5 shrink-0">
                    <Search size={16} />
                    <span>Track Document</span>
                  </button>
                </div>

                {validationError ? (
                  <p
                    id="ticket-code-error"
                    role="alert"
                    className="text-xs text-[#b91c1c] font-medium mt-2"
                  >
                    {validationError}
                  </p>
                ) : (
                  <p id="ticket-code-help" className="text-xs text-ink-muted mt-2">
                    Enter the 4-character suffix from your claim slip, or paste a
                    complete code such as{" "}
                    <span className="font-mono font-medium text-ink">
                      SPC-8X92
                    </span>
                    .
                  </p>
                )}
              </div>

              {/* Recent Lookups */}
              {recentTickets.length > 0 && (
                <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted mr-1">
                    <Clock size={13} />
                    <span>Recent:</span>
                  </span>
                  {recentTickets.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => navigate(`/track/${code}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] rounded-md bg-rail border border-border hover:border-maroon-300 hover:bg-maroon-50 text-xs font-mono font-medium text-ink hover:text-maroon-700 transition-colors cursor-pointer tabular-nums"
                    >
                      <span>{code}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearRecent}
                    aria-label="Clear recent lookups"
                    className="icon-btn ml-auto"
                    title="Clear recent lookups"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Official Status Guide Rail */}
          <aside className="lg:col-span-5 panel-recessed p-5 sm:p-6 space-y-5">
            <div className="pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-ink">
                Official Document Status Guide
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                How Academic Affairs classifies tickets throughout review.
              </p>
            </div>

            <dl className="divide-y divide-border">
              {TICKET_STATUSES.map((item) => (
                <div key={item.value} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <dt>
                    <StatusBadge status={item.value} variant="full" />
                  </dt>
                  <dd className="text-xs text-ink-muted leading-relaxed prose-measure">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="pt-3 border-t border-border text-xs text-ink-muted leading-relaxed">
              Lost your claim stub or need urgent follow-up? Visit the{" "}
              <span className="font-medium text-ink">
                Office of the Vice President for Academic Affairs
              </span>{" "}
              with your student or faculty ID.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
