import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import { TICKET_STATUSES, getStatusMeta } from "../../lib/ticketStatus";
import { formatDateTime, formatShortDateTime } from "../../lib/dateUtils";
import {
  ArrowLeft,
  Tag,
  Building2,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  MessageSquare,
  Trash2,
  History,
  X,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_STYLE_MAP = {
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
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Release form state
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasedTo, setReleasedTo] = useState("");
  const [savingRelease, setSavingRelease] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          departments (name),
          personnel (name, avatar_url),
          profiles:created_by (full_name)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setTicket(data);

      const { data: logsData } = await supabase
        .from("ticket_logs")
        .select(
          `
          *,
          profiles:actor_id (full_name)
        `,
        )
        .eq("ticket_id", id)
        .order("created_at", { ascending: false });

      setLogs(logsData || []);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Failed to load ticket");
      navigate("/admin/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Real-time subscription for ticket and logs changes
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`ticket-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${id}`,
        },
        () => {
          fetchTicket();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_logs",
          filter: `ticket_id=eq.${id}`,
        },
        () => {
          fetchTicket();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchTicket]);

  const updateStatus = async (newStatus, releaseData = null) => {
    if (!ticket) return false;

    setUpdating(true);
    try {
      const updateData = { status: newStatus };

      if (newStatus === "Approved and released" && releaseData) {
        updateData.released_to = releaseData.released_to;
        updateData.released_at = releaseData.released_at;
      } else if (ticket.status === "Approved and released") {
        updateData.released_to = null;
        updateData.released_at = null;
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticket.id);

      if (error) throw error;

      if (newStatus === "Approved and released" && releaseData?.released_to) {
        const { error: logError } = await supabase.from("ticket_logs").insert({
          ticket_id: ticket.id,
          actor_id: user?.id || null,
          action: `Released to "${releaseData.released_to}"`,
        });
        if (logError) {
          console.warn("Failed to insert release log:", logError);
        }
      } else if (
        ticket.status === "Approved and released" &&
        ticket.released_to
      ) {
        const { error: logError } = await supabase.from("ticket_logs").insert({
          ticket_id: ticket.id,
          actor_id: user?.id || null,
          action: "Cleared prior release record after status change",
        });
        if (logError) {
          console.warn("Failed to insert release clear log:", logError);
        }
      }

      const statusMeta = getStatusMeta(newStatus);
      toast.success(`Status updated to "${statusMeta.label}"`);
      await fetchTicket();
      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusClick = (newStatus) => {
    if (!ticket || ticket.status === newStatus) return;

    if (newStatus === "Approved and released") {
      setReleasedTo("");
      setShowReleaseModal(true);
      return;
    }

    updateStatus(newStatus);
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    const recipient = releasedTo.trim();
    if (!recipient) {
      toast.error("Please enter where the document is released to");
      return;
    }

    setSavingRelease(true);
    try {
      const ok = await updateStatus("Approved and released", {
        released_to: recipient,
        released_at: new Date().toISOString(),
      });
      if (ok) {
        setShowReleaseModal(false);
        setReleasedTo("");
      }
    } finally {
      setSavingRelease(false);
    }
  };

  const deleteTicket = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this ticket? This action cannot be undone.",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticket.id);

      if (error) throw error;

      toast.success("Ticket deleted");
      navigate("/admin/tickets");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const currentMeta = getStatusMeta(ticket.status);
  const currentStyle = STATUS_STYLE_MAP[currentMeta.tone] || {
    icon: Clock,
    color: "text-gray-600",
    bg: "bg-gray-100",
  };
  const StatusIcon = currentStyle.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin/tickets")}
            aria-label="Back to tickets"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tabular-nums">
                {ticket.ticket_code}
              </h1>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 tabular-nums">
                #{ticket.sequential_id}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{ticket.subject}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={deleteTicket}
            className="btn-ghost text-red-600 hover:bg-red-50"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Update */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="grid grid-cols-2 gap-3">
              {TICKET_STATUSES.map((status) => {
                const style = STATUS_STYLE_MAP[status.tone];
                const Icon = style.icon;
                const isActive = ticket.status === status.value;
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => handleStatusClick(status.value)}
                    disabled={updating || isActive}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? `border-current ${style.bg} ${style.color}`
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={isActive ? style.color : "text-gray-400"}
                    />
                    <span
                      className={`text-sm font-medium ${isActive ? style.color : "text-gray-600"}`}
                    >
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ticket Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Tag size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="font-medium text-gray-900">{ticket.subject}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <User size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Affected Party</p>
                  <p className="font-medium text-gray-900">
                    {ticket.affected_party}
                  </p>
                </div>
              </div>

              {ticket.departments && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900">
                      {ticket.departments.name}
                    </p>
                  </div>
                </div>
              )}

              {ticket.personnel && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {ticket.personnel.avatar_url ? (
                      <img
                        src={ticket.personnel.avatar_url}
                        alt={ticket.personnel.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Received By</p>
                    <p className="font-medium text-gray-900">
                      {ticket.personnel.name}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date Received</p>
                  <p className="font-medium text-gray-900 tabular-nums">
                    {formatDateTime(ticket.received_at)}
                  </p>
                </div>
              </div>

              {/* Release Information */}
              {ticket.status === "Approved and released" &&
                ticket.released_to && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Released To</p>
                      <p className="font-medium text-gray-900">
                        {ticket.released_to}
                      </p>
                      {ticket.released_at && (
                        <p className="text-sm text-gray-500 mt-1 tabular-nums">
                          {formatDateTime(ticket.released_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {ticket.remarks && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-500">
                      Remarks
                    </span>
                  </div>
                  <p className="text-gray-900">{ticket.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Current Status</h2>
            <div
              className={`flex items-center gap-3 p-4 rounded-xl ${currentStyle.bg}`}
            >
              <StatusIcon size={24} className={currentStyle.color} />
              <span className={`font-semibold ${currentStyle.color}`}>
                {currentMeta.label}
              </span>
            </div>
          </div>

          {/* Activity Log */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Activity Log</h2>
            </div>
            {logs.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-4 border-l-2 border-gray-100"
                  >
                    <p className="text-sm text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500 mt-1 tabular-nums">
                      {log.profiles?.full_name || "System"} •{" "}
                      {formatShortDateTime(log.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No activity yet</p>
            )}
          </div>

          {/* Meta */}
          <div className="card p-6 text-sm text-gray-500">
            <p>
              Created by{" "}
              <span className="text-gray-700">
                {ticket.profiles?.full_name || "Unknown"}
              </span>
            </p>
            <p className="mt-1 tabular-nums">
              {formatDateTime(ticket.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Release Form Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !savingRelease && setShowReleaseModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slideUp">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Release Document
              </h2>
              <button
                type="button"
                disabled={savingRelease}
                onClick={() => setShowReleaseModal(false)}
                aria-label="Close modal"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReleaseSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="releasedTo" className="label">
                  Released To
                </label>
                <input
                  id="releasedTo"
                  type="text"
                  value={releasedTo}
                  onChange={(e) => setReleasedTo(e.target.value)}
                  className="input"
                  placeholder="Enter recipient/location"
                  required
                  autoFocus
                />
                <p className="text-sm text-gray-400 mt-2">
                  Specify where or to whom the document is being released.
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={savingRelease}
                  onClick={() => setShowReleaseModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRelease || !releasedTo.trim()}
                  className="btn-primary flex-1"
                >
                  {savingRelease ? "Saving…" : "Confirm Release"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
