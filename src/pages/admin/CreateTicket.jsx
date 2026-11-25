import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import {
  toLocalDateTimeInputValue,
  localDateTimeToISO,
  formatDateTime,
} from "../../lib/dateUtils";
import StatusBadge from "../../components/ui/StatusBadge";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import { Save, ArrowLeft, User } from "lucide-react";
import toast from "react-hot-toast";

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState(() => ({
    subject: "",
    customSubject: "",
    department_id: "",
    personnel_id: "",
    affected_party: "",
    received_at: toLocalDateTimeInputValue(),
    remarks: "",
  }));

  const [isOtherSubject, setIsOtherSubject] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
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
        setSubjects(subjRes.data || []);
        setPersonnel(persRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSubjects = useMemo(
    () =>
      subjects.filter((item) => item.name?.trim().toLowerCase() !== "others"),
    [subjects],
  );

  const selectedPersonnel = useMemo(
    () => personnel.find((p) => p.id === formData.personnel_id) || null,
    [personnel, formData.personnel_id],
  );

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === formData.department_id) || null,
    [departments, formData.department_id],
  );

  const resolvedSubject = isOtherSubject
    ? formData.customSubject.trim()
    : formData.subject.trim();

  const handleSubjectChange = (e) => {
    const value = e.target.value;
    setErrors((prev) => ({ ...prev, subject: undefined }));

    if (value === "Others") {
      setIsOtherSubject(true);
      setFormData((prev) => ({ ...prev, subject: "", customSubject: "" }));
    } else {
      setIsOtherSubject(false);
      setFormData((prev) => ({ ...prev, subject: value, customSubject: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const subject = resolvedSubject;
    const affectedParty = formData.affected_party.trim();
    const nextErrors = {};

    if (!subject) {
      nextErrors.subject = isOtherSubject
        ? "Please enter a custom subject"
        : "Please select a subject";
    }
    if (!affectedParty) {
      nextErrors.affected_party = "Please enter the affected party";
    }
    if (!formData.received_at) {
      nextErrors.received_at = "Please specify the date and time received";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          subject,
          department_id: formData.department_id || null,
          personnel_id: formData.personnel_id || null,
          affected_party: affectedParty,
          received_at: localDateTimeToISO(formData.received_at),
          remarks: formData.remarks.trim() || null,
          created_by: user.id,
          status: "Pending",
        })
        .select()
        .single();

      if (error) throw error;

      const { error: logError } = await supabase.from("ticket_logs").insert({
        ticket_id: data.id,
        actor_id: user.id,
        action: "Ticket created",
      });

      if (logError) {
        console.warn("Ticket created but failed to insert audit log:", logError);
        toast("Ticket created, but initial activity log could not be recorded.");
      } else {
        toast.success(`Ticket ${data.ticket_code} created successfully!`);
      }

      navigate(`/admin/tickets/${data.id}`);
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin/tickets")}
          aria-label="Back to tickets"
          className="icon-btn -ml-2"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Create Ticket
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Log an incoming document request and assign initial routing details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Intake Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 card divide-y divide-border overflow-hidden"
          noValidate
        >
          {/* Section 1: Document Details */}
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Document Details</h2>

            <div>
              <label htmlFor="subject" className="label">
                Subject *
              </label>
              {!isOtherSubject ? (
                <select
                  id="subject"
                  value={formData.subject || ""}
                  onChange={handleSubjectChange}
                  className={`select ${errors.subject ? "input-error" : ""}`}
                  required={!isOtherSubject}
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
                    id="subject"
                    type="text"
                    value={formData.customSubject}
                    onChange={(e) => {
                      setErrors((prev) => ({ ...prev, subject: undefined }));
                      setFormData((prev) => ({
                        ...prev,
                        customSubject: e.target.value,
                      }));
                    }}
                    className={`input ${errors.subject ? "input-error" : ""}`}
                    placeholder="Enter custom subject"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtherSubject(false);
                      setErrors((prev) => ({ ...prev, subject: undefined }));
                    }}
                    className="text-xs font-medium text-maroon-700 hover:text-maroon-800 cursor-pointer"
                  >
                    ← Back to predefined subjects
                  </button>
                </div>
              )}
              {errors.subject && (
                <p className="text-xs text-[#b91c1c] mt-1.5">
                  {errors.subject}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="affected_party" className="label">
                Affected Party *
              </label>
              <input
                id="affected_party"
                type="text"
                value={formData.affected_party}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, affected_party: undefined }));
                  setFormData((prev) => ({
                    ...prev,
                    affected_party: e.target.value,
                  }));
                }}
                className={`input ${errors.affected_party ? "input-error" : ""}`}
                placeholder="Student, faculty member, or requesting office"
                required
              />
              {errors.affected_party && (
                <p className="text-xs text-[#b91c1c] mt-1.5">
                  {errors.affected_party}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="remarks" className="label">
                Remarks (Optional)
              </label>
              <textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                }
                className="input min-h-[96px] resize-y"
                placeholder="Initial routing notes or missing attachments…"
              />
            </div>
          </div>

          {/* Section 2: Intake & Routing */}
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-ink">
              Intake &amp; Routing
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="label">
                  Origin Department
                </label>
                <select
                  id="department"
                  value={formData.department_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department_id: e.target.value,
                    }))
                  }
                  className="select"
                >
                  <option value="">Select a department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="personnel" className="label">
                  Received By
                </label>
                <select
                  id="personnel"
                  value={formData.personnel_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      personnel_id: e.target.value,
                    }))
                  }
                  className="select"
                >
                  <option value="">Select personnel…</option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedPersonnel && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                    <div className="w-6 h-6 bg-rail rounded-full border border-border flex items-center justify-center overflow-hidden">
                      {selectedPersonnel.avatar_url ? (
                        <img
                          src={selectedPersonnel.avatar_url}
                          alt={selectedPersonnel.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={12} className="text-ink-subtle" />
                      )}
                    </div>
                    <span>{selectedPersonnel.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="received_at" className="label">
                Date &amp; Time Received *
              </label>
              <input
                id="received_at"
                type="datetime-local"
                value={formData.received_at}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, received_at: undefined }));
                  setFormData((prev) => ({
                    ...prev,
                    received_at: e.target.value,
                  }));
                }}
                className={`input ${errors.received_at ? "input-error" : ""}`}
                required
              />
              {errors.received_at && (
                <p className="text-xs text-[#b91c1c] mt-1.5">
                  {errors.received_at}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-rail/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/tickets")}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              <Save size={16} />
              <span>{submitting ? "Creating…" : "Create Ticket"}</span>
            </button>
          </div>
        </form>

        {/* Live Public Docket Preview */}
        <aside className="lg:col-span-4 panel-recessed p-5 space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
            <h2 className="text-sm font-semibold text-ink">
              Public Slip Preview
            </h2>
            <StatusBadge status="Pending" />
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="eyebrow">Ticket Code</p>
              <p className="font-mono font-semibold text-maroon-700 mt-0.5">
                SPC-XXXX <span className="text-xs font-normal text-ink-muted">(auto-assigned)</span>
              </p>
            </div>

            <div>
              <p className="eyebrow">Subject</p>
              <p className="font-medium text-ink mt-0.5">
                {resolvedSubject || "—"}
              </p>
            </div>

            <div>
              <p className="eyebrow">Origin Department</p>
              <p className="text-ink-muted mt-0.5">
                {selectedDepartment?.name || "Not specified"}
              </p>
            </div>

            <div>
              <p className="eyebrow">Received By</p>
              <p className="text-ink-muted mt-0.5">
                {selectedPersonnel?.name || "OVPAA Staff"}
              </p>
            </div>

            <div>
              <p className="eyebrow">Date Received</p>
              <p className="text-ink-muted tabular-nums mt-0.5">
                {formData.received_at
                  ? formatDateTime(localDateTimeToISO(formData.received_at))
                  : "—"}
              </p>
            </div>

            {formData.remarks.trim() && (
              <div className="pt-2 border-t border-border">
                <p className="eyebrow">Remarks</p>
                <p className="text-xs text-ink-muted mt-1 prose-measure">
                  {formData.remarks.trim()}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-ink-muted pt-2 border-t border-border">
            Affected party names stay internal in the staff registry and are
            not exposed on the public lookup page.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default CreateTicket;
