import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import { TICKET_STATUSES, getStatusMeta } from "../../lib/ticketStatus";
import {
  formatDateTime,
  formatShortDateTime,
  toLocalDateTimeInputValue,
  localDateTimeToISO,
} from "../../lib/dateUtils";
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
  Pencil,
  Save,
  Copy,
  Check,
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
  const [copiedLink, setCopiedLink] = useState(false);

  // Release form state
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasedTo, setReleasedTo] = useState("");
  const [savingRelease, setSavingRelease] = useState(false);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [refsLoaded, setRefsLoaded] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [isOtherSubject, setIsOtherSubject] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: "",
    customSubject: "",
    affected_party: "",
    department_id: "",
    personnel_id: "",
    received_at: "",
    remarks: "",
  });

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

  const filteredSubjects = useMemo(
    () =>
      subjects.filter(
        (item) => item.name?.trim().toLowerCase() !== "others",
      ),
    [subjects],
  );

  const startEditing = async () => {
    if (!ticket) return;

    let loadedSubjects = subjects;
    if (!refsLoaded) {
      try {
        const [deptRes, subjRes, persRes] = await Promise.all([
          supabase.from("departments").select("*").order("name"),
          supabase.from("subjects").select("*").order("name"),
          supabase.from("personnel").select("*").order("name"),
        ]);

        if (deptRes.error) throw deptRes.error;
        if (subjRes.error) throw subjRes.error;
        if (persRes.error) throw persRes.error;

        setDepartments(deptRes.data || []);
        loadedSubjects = subjRes.data || [];
        setSubjects(loadedSubjects);
        setPersonnel(persRes.data || []);
        setRefsLoaded(true);
      } catch (error) {
        console.error("Error loading reference options:", error);
        toast.error("Failed to load dropdown options");
        return;
      }
    }

    const matchesPredefined = loadedSubjects.some(
      (s) =>
        s.name?.trim().toLowerCase() !== "others" && s.name === ticket.subject,
    );

    setIsOtherSubject(!matchesPredefined);
    setEditForm({
      subject: matchesPredefined ? ticket.subject : "",
      customSubject: matchesPredefined ? "" : ticket.subject || "",
      affected_party: ticket.affected_party || "",
      department_id: ticket.department_id || "",
      personnel_id: ticket.personnel_id || "",
      received_at: toLocalDateTimeInputValue(ticket.received_at),
      remarks: ticket.remarks || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!ticket) return;

    const nextSubject = (
      isOtherSubject ? editForm.customSubject : editForm.subject
    ).trim();
    const nextAffectedParty = editForm.affected_party.trim();
    const nextRemarks = editForm.remarks.trim() || null;
    const nextDepartmentId = editForm.department_id || null;
    const nextPersonnelId = editForm.personnel_id || null;
    const nextReceivedAt = localDateTimeToISO(editForm.received_at);

    if (!nextSubject) {
      toast.error("Please enter a subject");
      return;
    }
    if (!nextAffectedParty) {
      toast.error("Please enter the affected party");
      return;
    }
    if (!editForm.received_at) {
      toast.error("Please enter the date and time received");
      return;
    }

    const changedFields = [];
    if (nextSubject !== ticket.subject) changedFields.push("subject");
    if (nextAffectedParty !== ticket.affected_party) {
      changedFields.push("affected party");
    }
    if (nextDepartmentId !== (ticket.department_id || null)) {
      changedFields.push("department");
    }
    if (nextPersonnelId !== (ticket.personnel_id || null)) {
      changedFields.push("received by");
    }
    if (
      toLocalDateTimeInputValue(ticket.received_at) !== editForm.received_at
    ) {
      changedFields.push("date received");
    }
    if ((nextRemarks || "") !== (ticket.remarks || "")) {
      changedFields.push("remarks");
    }

    if (changedFields.length === 0) {
      setIsEditing(false);
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          subject: nextSubject,
          affected_party: nextAffectedParty,
          department_id: nextDepartmentId,
          personnel_id: nextPersonnelId,
          received_at: nextReceivedAt,
          remarks: nextRemarks,
        })
        .eq("id", ticket.id);

      if (error) throw error;

      const { error: logError } = await supabase.from("ticket_logs").insert({
        ticket_id: ticket.id,
        actor_id: user?.id || null,
        action: `Updated ticket details (${changedFields.join(", ")})`,
      });

      if (logError) {
        console.warn("Ticket updated but audit log failed:", logError);
      }

      toast.success("Ticket details updated");
      setIsEditing(false);
      await fetchTicket();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error(error.message || "Failed to update ticket details");
    } finally {
      setSavingEdit(false);
    }
  };

  const copyTrackingLink = async () => {
    if (!ticket?.ticket_code) return;
    const url = `${window.location.origin}/track/${ticket.ticket_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Public tracking link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Unable to copy link to clipboard");
    }
  };

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
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyTrackingLink}
            className="btn-secondary"
          >
            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">
              {copiedLink ? "Copied Link" : "Copy Tracking Link"}
            </span>
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="btn-secondary"
            >
              <Pencil size={16} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
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

          {/* Details / Inline Edit */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {isEditing ? "Edit Ticket Details" : "Ticket Details"}
              </h2>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label htmlFor="edit-subject" className="label">
                    Subject *
                  </label>
                  {!isOtherSubject ? (
                    <select
                      id="edit-subject"
                      value={editForm.subject}
                      onChange={(e) => {
                        if (e.target.value === "Others") {
                          setIsOtherSubject(true);
                          setEditForm((prev) => ({
                            ...prev,
                            subject: "",
                            customSubject: "",
                          }));
                        } else {
                          setEditForm((prev) => ({
                            ...prev,
                            subject: e.target.value,
                            customSubject: "",
                          }));
                        }
                      }}
                      className="select"
                      required
                    >
                      <option value="">Select a subject…</option>
                      {filteredSubjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      <option value="Others">Others (Custom)</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        id="edit-subject"
                        type="text"
                        value={editForm.customSubject}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            customSubject: e.target.value,
                          }))
                        }
                        className="input"
                        placeholder="Enter custom subject"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsOtherSubject(false)}
                        className="text-sm text-maroon-700 hover:text-maroon-800"
                      >
                        ← Back to dropdown
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-affected-party" className="label">
                    Affected Party *
                  </label>
                  <input
                    id="edit-affected-party"
                    type="text"
                    value={editForm.affected_party}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        affected_party: e.target.value,
                      }))
                    }
                    className="input"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-department" className="label">
                      Department
                    </label>
                    <select
                      id="edit-department"
                      value={editForm.department_id}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          department_id: e.target.value,
                        }))
                      }
                      className="select"
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-personnel" className="label">
                      Received By
                    </label>
                    <select
                      id="edit-personnel"
                      value={editForm.personnel_id}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          personnel_id: e.target.value,
                        }))
                      }
                      className="select"
                    >
                      <option value="">Unassigned</option>
                      {personnel.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-received-at" className="label">
                    Date &amp; Time Received *
                  </label>
                  <input
                    id="edit-received-at"
                    type="datetime-local"
                    value={editForm.received_at}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        received_at: e.target.value,
                      }))
                    }
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-remarks" className="label">
                    Remarks
                  </label>
                  <textarea
                    id="edit-remarks"
                    value={editForm.remarks}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    className="input min-h-[90px] resize-y"
                    placeholder="Add remarks or routing instructions…"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary flex-1"
                  >
                    <Save size={16} />
                    <span>{savingEdit ? "Saving…" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Tag size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Subject</p>
                    <p className="font-medium text-gray-900">
                      {ticket.subject}
                    </p>
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
                    <p className="text-gray-900 max-w-[65ch]">
                      {ticket.remarks}
                    </p>
                  </div>
                )}
              </div>
            )}
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
