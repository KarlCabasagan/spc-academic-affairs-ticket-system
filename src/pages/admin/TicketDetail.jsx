import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
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
} from "lucide-react";
import toast from "react-hot-toast";

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const statuses = [
    {
      value: "Pending",
      label: "Pending",
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      value: "Approved and released",
      label: "Approved & Released",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      value: "Disapproved and revised",
      label: "Disapproved & Revised",
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    {
      value: "Approved and Recommended",
      label: "Approved & Recommended",
      icon: ThumbsUp,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
  ];

  const fetchTicket = async () => {
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

      // Fetch logs
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
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchTicket();
  }, [id]);

  const updateStatus = async (newStatus) => {
    if (ticket.status === newStatus) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticket.id);

      if (error) throw error;

      toast.success(`Status updated to "${newStatus}"`);
      fetchTicket();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const currentStatus = statuses.find((s) => s.value === ticket.status);
  const StatusIcon = currentStatus?.icon || Clock;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/tickets")}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {ticket.ticket_code}
              </h1>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">#{ticket.sequential_id}</span>
            </div>
            <p className="text-gray-500 mt-1">{ticket.subject}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={deleteTicket}
            className="btn-ghost text-red-600 hover:bg-red-50"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Update */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map((status) => {
                const Icon = status.icon;
                const isActive = ticket.status === status.value;
                return (
                  <button
                    key={status.value}
                    onClick={() => updateStatus(status.value)}
                    disabled={updating || isActive}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? `border-current ${status.bg} ${status.color}`
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={isActive ? status.color : "text-gray-400"}
                    />
                    <span
                      className={`text-sm font-medium ${isActive ? status.color : "text-gray-600"}`}
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
                  <p className="font-medium text-gray-900">
                    {formatDate(ticket.received_at)}
                  </p>
                </div>
              </div>

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
              className={`flex items-center gap-3 p-4 rounded-xl ${currentStatus?.bg}`}
            >
              <StatusIcon size={24} className={currentStatus?.color} />
              <span className={`font-semibold ${currentStatus?.color}`}>
                {currentStatus?.label}
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
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-4 border-l-2 border-gray-100"
                  >
                    <p className="text-sm text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.profiles?.full_name || "System"} •{" "}
                      {new Date(log.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
            <p className="mt-1">{formatDate(ticket.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
