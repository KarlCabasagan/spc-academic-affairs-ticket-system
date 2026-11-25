import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getStatusMeta, normalizeTicketCode } from "../../lib/ticketStatus";
import { formatDateTime } from "../../lib/dateUtils";
import StatusBadge from "../../components/ui/StatusBadge";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import {
  ArrowLeft,
  User,
  AlertCircle,
  Search,
  Copy,
  Check,
  Printer,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

const RECENT_TICKETS_KEY = "spc_recent_tickets";

const saveRecentTicket = (code) => {
  if (!code) return;
  try {
    const raw = localStorage.getItem(RECENT_TICKETS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const updated = [code, ...list.filter((c) => c !== code)].slice(0, 4);
    localStorage.setItem(RECENT_TICKETS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
};

const TrackTicket = () => {
  const { ticketCode } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [personnel, setPersonnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [quickCode, setQuickCode] = useState("");

  const normalized = normalizeTicketCode(ticketCode);
  const lookupCode =
    normalized.fullCode || (ticketCode || "").trim().toUpperCase();

  const fetchTicket = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (!lookupCode || !normalized.isValid) {
        setTicket(null);
        setPersonnel(null);
        setError(
          "Invalid ticket code format. Please enter a complete code such as SPC-8X92.",
        );
        setLoading(false);
        return;
      }

      try {
        if (showSpinner) {
          setLoading(true);
        }
        setError(null);
        setPersonnel(null);

        const { data, error: fetchError } = await supabase
          .from("tickets")
          .select(
            `
            id,
            ticket_code,
            sequential_id,
            subject,
            status,
            remarks,
            received_at,
            updated_at,
            personnel_id,
            department_id,
            released_to,
            released_at,
            departments (name)
          `,
          )
          .eq("ticket_code", lookupCode)
          .single();

        if (fetchError) {
          setTicket(null);
          if (fetchError.code === "PGRST116") {
            setError(
              "Ticket not found. Verify the code on your claim slip and try again.",
            );
          } else {
            throw fetchError;
          }
          return;
        }

        setTicket(data);
        saveRecentTicket(data.ticket_code);

        if (data.personnel_id) {
          const { data: personnelData } = await supabase
            .from("personnel")
            .select("name, avatar_url")
            .eq("id", data.personnel_id)
            .single();
          setPersonnel(personnelData || null);
        } else {
          setPersonnel(null);
        }
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setError(
          "An error occurred while fetching the ticket. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [lookupCode, normalized.isValid],
  );

  useEffect(() => {
    fetchTicket({ showSpinner: true });
  }, [fetchTicket]);

  // Real-time subscription re-fetches full ticket + relations on updates
  useEffect(() => {
    if (!ticket?.id) return;

    const channel = supabase
      .channel(`public-ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticket.id}`,
        },
        () => {
          fetchTicket({ showSpinner: false });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, fetchTicket]);

  const handleCopyCode = async () => {
    if (!ticket?.ticket_code) return;
    try {
      await navigator.clipboard.writeText(ticket.ticket_code);
      setCopied(true);
      toast.success(`Copied ${ticket.ticket_code}`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Unable to copy ticket code");
    }
  };

  const handleQuickLookup = (e) => {
    e.preventDefault();
    const next = normalizeTicketCode(quickCode);
    if (!next.isValid) {
      toast.error("Enter at least 3 characters (for example, 8X92)");
      return;
    }
    setQuickCode("");
    navigate(`/track/${next.fullCode}`);
  };

  if (loading) {
    return (
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="card max-w-md w-full p-8 text-center animate-fadeIn">
          <div className="w-12 h-12 bg-[#fdf1f1] border border-[#f4c5c5] rounded-lg flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={22} className="text-[#991b1b]" />
          </div>
          <h1 className="text-xl font-bold text-ink mb-2">Ticket Not Found</h1>
          <p className="text-sm text-ink-muted mb-6 prose-measure mx-auto">
            {error}
          </p>

          <form onSubmit={handleQuickLookup} className="flex gap-2 mb-4">
            <input
              type="text"
              aria-label="Try another ticket code"
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              placeholder="Try SPC-8X92"
              className="input font-mono uppercase text-sm"
            />
            <button type="submit" className="btn-primary shrink-0">
              <Search size={16} />
              <span>Lookup</span>
            </button>
          </form>

          <Link to="/" className="btn-ghost w-full">
            <ArrowLeft size={16} />
            <span>Return to Document Tracker</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(ticket.status);
  const isDisapproved = ticket.status === "Disapproved and revised";
  const stage = statusMeta.stage;

  const stages = [
    { number: 1, label: "Received" },
    {
      number: 2,
      label: isDisapproved
        ? "Returned for Revision"
        : ticket.status === "Approved and Recommended"
          ? "Recommended"
          : "Under Review",
    },
    { number: 3, label: "Released" },
  ];

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top Navigation & Utilities */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-maroon-700 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Tracker</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleQuickLookup} className="flex items-center gap-2">
              <input
                type="text"
                aria-label="Track another ticket code"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                placeholder="Track another code…"
                className="input py-1.5 min-h-[40px] w-44 font-mono text-xs uppercase"
              />
              <button type="submit" className="btn-secondary px-3">
                <Search size={14} />
                <span>Go</span>
              </button>
            </form>
            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-secondary px-3"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? "Copied" : "Copy Code"}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary px-3"
            >
              <Printer size={15} />
              <span>Print Slip</span>
            </button>
          </div>
        </div>

        {/* Official OVPAA Routing Slip */}
        <article className="card overflow-hidden animate-fadeIn">
          {/* Slip Header */}
          <div className="px-6 py-5 border-b border-border bg-rail/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/icon-192.png"
                alt="St. Peter's College Crest"
                className="w-11 h-11 rounded-full object-cover border border-border-strong shrink-0"
              />
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  St. Peter&apos;s College · OVPAA Routing Slip
                </p>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <h1 className="font-mono text-2xl sm:text-3xl font-semibold text-ink tracking-tight tabular-nums">
                    {ticket.ticket_code}
                  </h1>
                  {ticket.sequential_id && (
                    <span className="font-mono text-sm text-ink-muted tabular-nums">
                      #{ticket.sequential_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <StatusBadge status={ticket.status} variant="full" />
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted print:hidden">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600"
                />
                Live status sync enabled
              </span>
            </div>
          </div>

          {/* 3-Stage Visual Routing Progress */}
          <div className="px-6 py-5 border-b border-border">
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stages.map((step) => {
                const isComplete =
                  stage > step.number ||
                  (stage === step.number && step.number === 3);
                const isCurrent = stage === step.number;
                const isRevisionStep = isDisapproved && step.number === 2;

                return (
                  <li
                    key={step.number}
                    className={`flex items-center gap-3 p-3 rounded-md border ${
                      isRevisionStep
                        ? "bg-[#fdf1f1] border-[#f4c5c5] text-[#991b1b]"
                        : isCurrent || isComplete
                          ? "bg-maroon-50/70 border-maroon-200 text-maroon-900"
                          : "bg-canvas border-border text-ink-muted"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-mono font-semibold flex items-center justify-center shrink-0 tabular-nums ${
                        isRevisionStep
                          ? "bg-[#991b1b] text-white"
                          : isComplete
                            ? "bg-maroon-700 text-white"
                            : isCurrent
                              ? "bg-maroon-700 text-white"
                              : "bg-rail text-ink-muted border border-border-strong"
                      }`}
                    >
                      {isComplete ? <CheckCircle2 size={14} /> : step.number}
                    </span>
                    <span className="text-xs font-semibold leading-tight">
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Docket Metadata Grid */}
          <dl className="grid sm:grid-cols-2 divide-y sm:divide-y-0 border-b border-border">
            <div className="p-5 sm:border-r sm:border-b border-border">
              <dt className="eyebrow">Subject</dt>
              <dd className="text-sm font-semibold text-ink mt-1.5">
                {ticket.subject}
              </dd>
            </div>

            <div className="p-5 sm:border-b border-border">
              <dt className="eyebrow">Origin Department</dt>
              <dd className="text-sm font-medium text-ink mt-1.5">
                {ticket.departments?.name || "Not specified"}
              </dd>
            </div>

            <div className="p-5 sm:border-r sm:border-b border-border">
              <dt className="eyebrow">Received By</dt>
              <dd className="mt-1.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-rail border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {personnel?.avatar_url ? (
                    <img
                      src={personnel.avatar_url}
                      alt={personnel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={14} className="text-ink-subtle" />
                  )}
                </div>
                <span className="text-sm font-medium text-ink">
                  {personnel?.name || "OVPAA Staff"}
                </span>
              </dd>
            </div>

            <div className="p-5 sm:border-b border-border">
              <dt className="eyebrow">Date &amp; Time Received</dt>
              <dd className="text-sm font-medium text-ink mt-1.5 tabular-nums">
                {formatDateTime(ticket.received_at)}
              </dd>
            </div>

            <div className="p-5 sm:border-r border-border">
              <dt className="eyebrow">Last Status Update</dt>
              <dd className="text-sm font-medium text-ink mt-1.5 tabular-nums">
                {formatDateTime(ticket.updated_at || ticket.received_at)}
              </dd>
            </div>

            <div className="p-5">
              <dt className="eyebrow">Current Stage Summary</dt>
              <dd className="text-sm text-ink-muted mt-1.5">
                {statusMeta.description}
              </dd>
            </div>
          </dl>

          {/* Release Details + Remarks */}
          {(ticket.status === "Approved and released" && ticket.released_to) ||
          ticket.remarks ? (
            <div className="p-6 space-y-4">
              {ticket.status === "Approved and released" &&
                ticket.released_to && (
                  <div className="p-4 rounded-md bg-[#eef7f1] border border-[#bfe0ca]">
                    <p className="eyebrow text-[#166534]">Release Record</p>
                    <p className="text-sm font-semibold text-[#14532d] mt-1">
                      Released to: {ticket.released_to}
                    </p>
                    {ticket.released_at && (
                      <p className="text-xs text-[#166534] mt-1 tabular-nums">
                        Released on {formatDateTime(ticket.released_at)}
                      </p>
                    )}
                  </div>
                )}

              {ticket.remarks && (
                <div className="p-4 rounded-md bg-rail border border-border">
                  <p className="eyebrow">Office Remarks</p>
                  <p className="text-sm text-ink mt-1.5 leading-relaxed prose-measure">
                    {ticket.remarks}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </article>

        <p className="text-center text-xs text-ink-muted">
          Present your ticket code{" "}
          <span className="font-mono font-medium text-ink">
            {ticket.ticket_code}
          </span>{" "}
          when claiming or inquiring at the Academic Affairs Office.
        </p>
      </div>
    </div>
  );
};

export default TrackTicket;
