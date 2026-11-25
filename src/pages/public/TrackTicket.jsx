import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getStatusMeta, normalizeTicketCode } from "../../lib/ticketStatus";
import { formatDateTime } from "../../lib/dateUtils";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Search,
  MapPin,
} from "lucide-react";

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

const TONE_CLASSES = {
  pending: {
    icon: Clock,
    color: "text-yellow-700",
    bg: "bg-yellow-100",
  },
  approved: {
    icon: CheckCircle,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  disapproved: {
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-100",
  },
  recommended: {
    icon: ThumbsUp,
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  neutral: {
    icon: Clock,
    color: "text-gray-600",
    bg: "bg-gray-100",
  },
};

const TrackTicket = () => {
  const { ticketCode } = useParams();
  const [ticket, setTicket] = useState(null);
  const [personnel, setPersonnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalized = normalizeTicketCode(ticketCode);
  const lookupCode = normalized.fullCode || (ticketCode || "").trim().toUpperCase();

  const fetchTicket = useCallback(async ({ showSpinner = true } = {}) => {
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
            "Ticket not found. Please check your ticket code and try again.",
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
  }, [lookupCode, normalized.isValid]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Looking up your ticket…</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ticket Not Found
          </h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link to="/" className="btn-primary inline-flex">
            <Search size={18} />
            <span>Search Again</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(ticket.status);
  const statusStyle = TONE_CLASSES[statusMeta.tone] || TONE_CLASSES.neutral;
  const StatusIcon = statusStyle.icon;

  return (
    <div className="flex-1 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-maroon-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Search</span>
        </Link>

        {/* Ticket Card */}
        <div className="card p-6 sm:p-8 animate-slideUp">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ticket Code</p>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums">
                  {ticket.ticket_code}
                </h1>
                {ticket.sequential_id && (
                  <span className="text-sm font-mono text-gray-500 tabular-nums">
                    #{ticket.sequential_id}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusStyle.bg}`}
            >
              <StatusIcon size={18} className={statusStyle.color} />
              <span className={`font-medium text-sm ${statusStyle.color}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Subject */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                <Tag size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium text-gray-900">{ticket.subject}</p>
              </div>
            </div>

            {/* Department */}
            {ticket.departments && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Origin Department</p>
                  <p className="font-medium text-gray-900">
                    {ticket.departments.name}
                  </p>
                </div>
              </div>
            )}

            {/* Received By */}
            {personnel && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {personnel.avatar_url ? (
                    <img
                      src={personnel.avatar_url}
                      alt={personnel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received By</p>
                  <p className="font-medium text-gray-900">{personnel.name}</p>
                </div>
              </div>
            )}

            {/* Date Received */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                <Calendar size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Received</p>
                <p className="font-medium text-gray-900 tabular-nums">
                  {formatDateTime(ticket.received_at)}
                </p>
              </div>
            </div>

            {/* Release Info */}
            {ticket.status === "Approved and released" &&
              ticket.released_to && (
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                    <MapPin size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Released To</p>
                    <p className="font-medium text-green-900">
                      {ticket.released_to}
                    </p>
                    {ticket.released_at && (
                      <p className="text-sm text-green-600 mt-1 tabular-nums">
                        {formatDateTime(ticket.released_at)}
                      </p>
                    )}
                  </div>
                </div>
              )}

            {/* Remarks */}
            {ticket.remarks && (
              <div className="p-4 bg-maroon-50 rounded-xl border border-maroon-100">
                <p className="text-sm text-maroon-700 font-medium mb-1">
                  Remarks
                </p>
                <p className="text-maroon-900 max-w-[65ch]">{ticket.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-gray-400 text-sm mt-6">
          For inquiries, please visit the Academic Affairs Office.
        </p>
      </div>
    </div>
  );
};

export default TrackTicket;
