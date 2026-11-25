import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import {
  toLocalDateTimeInputValue,
  localDateTimeToISO,
} from "../../lib/dateUtils";
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
      subjects.filter(
        (item) => item.name?.trim().toLowerCase() !== "others",
      ),
    [subjects],
  );

  const selectedPersonnel = useMemo(
    () => personnel.find((p) => p.id === formData.personnel_id) || null,
    [personnel, formData.personnel_id],
  );

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

    const subject = isOtherSubject
      ? formData.customSubject.trim()
      : formData.subject.trim();
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-gray-900">Create Ticket</h1>
          <p className="text-gray-500 mt-1">Record a new document ticket.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5" noValidate>
        {/* Subject */}
        <div>
          <label htmlFor="subject" className="label">
            Subject *
          </label>
          {!isOtherSubject ? (
            <select
              id="subject"
              value={formData.subject || ""}
              onChange={handleSubjectChange}
              className={`select ${errors.subject ? "border-red-400" : ""}`}
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
                className="text-sm text-maroon-700 hover:text-maroon-800"
              >
                ← Back to dropdown
              </button>
            </div>
          )}
          {errors.subject && (
            <p className="text-xs text-red-600 mt-1">{errors.subject}</p>
          )}
        </div>

        {/* Affected Party */}
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
            placeholder="Enter the name of the student or person"
            required
          />
          {errors.affected_party && (
            <p className="text-xs text-red-600 mt-1">{errors.affected_party}</p>
          )}
        </div>

        {/* Department */}
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

        {/* Personnel */}
        <div>
          <label htmlFor="personnel" className="label">
            Received By
          </label>
          <div className="relative">
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
          </div>
          {selectedPersonnel && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {selectedPersonnel.avatar_url ? (
                  <img
                    src={selectedPersonnel.avatar_url}
                    alt={selectedPersonnel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={12} className="text-gray-400" />
                )}
              </div>
              <span>{selectedPersonnel.name}</span>
            </div>
          )}
        </div>

        {/* Received Date/Time */}
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
            <p className="text-xs text-red-600 mt-1">{errors.received_at}</p>
          )}
        </div>

        {/* Remarks */}
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
            className="input min-h-[100px] resize-y"
            placeholder="Add any notes or remarks…"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/admin/tickets")}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? (
              "Creating…"
            ) : (
              <>
                <Save size={18} />
                <span>Create Ticket</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;
