import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { Plus, Pencil, Trash2, Tags, Search } from "lucide-react";
import toast from "react-hot-toast";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, searchQuery]);

  const openModal = (subject = null) => {
    setEditingSubject(subject);
    setFormData({ name: subject?.name || "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSubject(null);
    setFormData({ name: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = formData.name.trim();
    if (!trimmed) {
      toast.error("Please enter a subject name");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update({ name: trimmed })
          .eq("id", editingSubject.id);

        if (error) throw error;
        toast.success("Subject updated successfully");
      } else {
        const { error } = await supabase
          .from("subjects")
          .insert({ name: trimmed });

        if (error) throw error;
        toast.success("Subject created successfully");
      }

      closeModal();
      fetchSubjects();
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error(error.message || "Failed to save subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("Subject deleted successfully");
      setDeleteTarget(null);
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              Subjects
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-rail border border-border text-xs font-mono font-medium text-ink-muted tabular-nums">
              {subjects.length}
            </span>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Standardized document categories shown during ticket creation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
        />
        <input
          type="text"
          aria-label="Filter subjects"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter subjects…"
          className="input"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Ledger List */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredSubjects.length > 0 ? (
        <div className="card divide-y divide-border overflow-hidden">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-canvas transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-md bg-[#eff4fb] border border-[#c5d6f5] flex items-center justify-center shrink-0">
                  <Tags size={17} className="text-[#1e40af]" />
                </div>
                <span className="font-medium text-sm text-ink truncate">
                  {subject.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openModal(subject)}
                  aria-label={`Edit ${subject.name}`}
                  className="icon-btn hover:text-maroon-700"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(subject)}
                  aria-label={`Delete ${subject.name}`}
                  className="icon-btn hover:text-[#991b1b] hover:bg-[#fdf1f1]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Tags}
            title={searchQuery ? "No matching subjects" : "No subjects yet"}
            description={
              searchQuery
                ? "Try clearing your search filter."
                : "Create standardized subjects so staff can categorize requests consistently."
            }
            action={
              !searchQuery ? (
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="btn-primary"
                >
                  <Plus size={16} />
                  <span>Add Subject</span>
                </button>
              ) : null
            }
          />
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingSubject ? "Edit Subject" : "Add Subject"}
        closeDisabled={submitting}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="subject-name" className="label">
              Subject Name *
            </label>
            <input
              id="subject-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              className="input"
              placeholder="e.g., Grade Correction"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={closeModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? "Saving…" : editingSubject ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Subject"
        message={`Delete subject "${deleteTarget?.name}"? Existing tickets using this subject text will remain unchanged.`}
        confirmLabel="Delete Subject"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default Subjects;
