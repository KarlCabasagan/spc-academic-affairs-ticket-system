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
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Trash2,
  History,
  Pencil,
  Save,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_STYLE_MAP = {
  pending: {
    icon: Clock,
    activeClass: "border-[#d97706] bg-[#fef9ec] text-[#92400e]",
    iconColor: "text-[#92400e]",
  },
  approved: {
    icon: CheckCircle,
    activeClass: "border-[#166534] bg-[#eef7f1] text-[#166534]",
    iconColor: "text-[#166534]",
  },
  disapproved: {
    icon: XCircle,
    activeClass: "border-[#991b1b] bg-[#fdf1f1] text-[#991b1b]",
    iconColor: "text-[#991b1b]",
  },
  recommended: {
    icon: ThumbsUp,
    activeClass: "border-[#1e40af] bg-[#eff4fb] text-[#1e40af]",
    iconColor: "text-[#1e40af]",
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

  // Release form modal state
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasedTo, setReleasedTo] = useState("");
  const [savingRelease, setSavingRelease] = useState(false);

  // Delete confirm modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      subjects.filter((item) => item.name?.trim().toLowerCase() !== "others"),
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

  const handleConfirmDelete = async () => {
    if (!ticket) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticket.id);

      if (error) throw error;

      toast.success("Ticket deleted");
      setShowDeleteConfirm(false);
      navigate("/admin/tickets");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/tickets")}
            aria-label="Back to tickets"
            className="icon-btn -ml-2 shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-2xl font-bold text-ink tracking-tight tabular-nums">
                {ticket.ticket_code}
              </h1>
              <span className="font-mono text-sm text-ink-muted tabular-nums">
                #{ticket.sequential_id}
              </span>
              <StatusBadge status={ticket.status} variant="full" />
            </div>
            <p className="text-sm text-ink-muted mt-1">{ticket.subject}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyTrackingLink}
            className="btn-secondary"
          >
            {copiedLink ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedLink ? "Copied Link" : "Copy Tracking Link"}</span>
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="btn-secondary"
            >
              <Pencil size={15} />
              <span>Edit</span>
            </button>
          )}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost text-[#991b1b] hover:bg-[#fdf1f1]"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Routing Status Decision Panel */}
          <section className="card p-5 space-y-3.5">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Routing Status Decision
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Select a status below to update the public tracker and record
                an audit entry.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    aria-pressed={isActive}
                    className={`flex items-center gap-3 p-3.5 rounded-md border text-left transition-[transform,background-color,border-color,color] duration-150 cursor-pointer active:scale-[0.98] disabled:cursor-default ${
                      isActive
                        ? `${style.activeClass} font-semibold`
                        : "border-border bg-surface text-ink-muted hover:bg-rail/60 hover:text-ink"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        isActive ? `${style.iconColor} shrink-0` : "text-ink-subtle shrink-0"
                      }
                    />
                    <span className="text-sm leading-tight">{status.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Docket Details / Inline Edit */}
          <section className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                {isEditing ? "Edit Docket Information" : "Docket Information"}
              </h2>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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
                        className="text-xs font-medium text-maroon-700 hover:text-maroon-800 cursor-pointer"
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
                    className="input min-h-[96px] resize-y"
                    placeholder="Add remarks or routing instructions…"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary"
                  >
                    <Save size={15} />
                    <span>{savingEdit ? "Saving…" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <dl className="grid sm:grid-cols-2 divide-y sm:divide-y-0">
                  <div className="p-5 sm:border-r sm:border-b border-border">
                    <dt className="eyebrow">Subject</dt>
                    <dd className="text-sm font-semibold text-ink mt-1">
                      {ticket.subject}
                    </dd>
                  </div>

                  <div className="p-5 sm:border-b border-border">
                    <dt className="eyebrow">Affected Party</dt>
                    <dd className="text-sm font-medium text-ink mt-1">
                      {ticket.affected_party}
                    </dd>
                  </div>

                  <div className="p-5 sm:border-r sm:border-b border-border">
                    <dt className="eyebrow">Origin Department</dt>
                    <dd className="text-sm text-ink mt-1">
                      {ticket.departments?.name || "Not specified"}
                    </dd>
                  </div>

                  <div className="p-5 sm:border-b border-border">
                    <dt className="eyebrow">Received By</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rail border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {ticket.personnel?.avatar_url ? (
                          <img
                            src={ticket.personnel.avatar_url}
                            alt={ticket.personnel.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={12} className="text-ink-subtle" />
                        )}
                      </div>
                      <span className="text-sm text-ink">
                        {ticket.personnel?.name || "Unassigned"}
                      </span>
                    </dd>
                  </div>

                  <div className="p-5 sm:border-r border-border">
                    <dt className="eyebrow">Date &amp; Time Received</dt>
                    <dd className="text-sm text-ink mt-1 tabular-nums">
                      {formatDateTime(ticket.received_at)}
                    </dd>
                  </div>

                  <div className="p-5">
                    <dt className="eyebrow">Last Updated</dt>
                    <dd className="text-sm text-ink mt-1 tabular-nums">
                      {formatDateTime(ticket.updated_at || ticket.created_at)}
                    </dd>
                  </div>
                </dl>

                {((ticket.status === "Approved and released" &&
                  ticket.released_to) ||
                  ticket.remarks) && (
                  <div className="p-5 border-t border-border space-y-3">
                    {ticket.status === "Approved and released" &&
                      ticket.released_to && (
                        <div className="p-4 rounded-md bg-[#eef7f1] border border-[#bfe0ca]">
                          <p className="eyebrow text-[#166534]">
                            Release Record
                          </p>
                          <p className="text-sm font-semibold text-[#14532d] mt-1">
                            Released to: {ticket.released_to}
                          </p>
                          {ticket.released_at && (
                            <p className="text-xs text-[#166534] mt-1 tabular-nums">
                              {formatDateTime(ticket.released_at)}
                            </p>
                          )}
                        </div>
                      )}

                    {ticket.remarks && (
                      <div className="p-4 rounded-md bg-rail border border-border">
                        <p className="eyebrow">Remarks</p>
                        <p className="text-sm text-ink mt-1.5 leading-relaxed prose-measure">
                          {ticket.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Audit Trail Sidebar */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <History size={16} className="text-ink-muted" />
              <h2 className="text-sm font-semibold text-ink">Audit Trail</h2>
            </div>

            {logs.length > 0 ? (
              <ol className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {logs.map((log, index) => (
                  <li key={log.id} className="relative pl-5">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-maroon-700"
                    />
                    {index < logs.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[3.5px] top-4 bottom-[-16px] w-px bg-border"
                      />
                    )}
                    <p className="text-sm text-ink leading-snug">
                      {log.action}
                    </p>
                    <p className="text-xs text-ink-muted mt-1 tabular-nums">
                      {log.profiles?.full_name || "System"} ·{" "}
                      {formatShortDateTime(log.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-ink-muted">No activity recorded yet.</p>
            )}
          </div>

          <div className="panel-recessed p-4 text-xs text-ink-muted space-y-1">
            <p className="eyebrow">Created By</p>
            <p className="text-sm font-medium text-ink">
              {ticket.profiles?.full_name || "Unknown"}
            </p>
            <p className="tabular-nums">{formatDateTime(ticket.created_at)}</p>
          </div>
        </aside>
      </div>

      {/* Release Modal */}
      <Modal
        open={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        title="Release Document"
        description="Record who received or where the finalized document was released."
        closeDisabled={savingRelease}
      >
        <form onSubmit={handleReleaseSubmit} className="space-y-4">
          <div>
            <label htmlFor="releasedTo" className="label">
              Released To *
            </label>
            <input
              id="releasedTo"
              type="text"
              value={releasedTo}
              onChange={(e) => setReleasedTo(e.target.value)}
              className="input"
              placeholder="Recipient name or receiving office"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={savingRelease}
              onClick={() => setShowReleaseModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRelease || !releasedTo.trim()}
              className="btn-primary"
            >
              {savingRelease ? "Saving…" : "Confirm Release"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Ticket"
        message={`Permanently delete ticket ${ticket.ticket_code}? Its audit trail logs will also be removed and cannot be recovered.`}
        confirmLabel="Delete Ticket"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default TicketDetail;
