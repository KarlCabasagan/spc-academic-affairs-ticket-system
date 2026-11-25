import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import toast from "react-hot-toast";

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, searchQuery]);

  const openModal = (department = null) => {
    setEditingDepartment(department);
    setFormData({ name: department?.name || "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDepartment(null);
    setFormData({ name: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = formData.name.trim();
    if (!trimmed) {
      toast.error("Please enter a department name");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from("departments")
          .update({ name: trimmed })
          .eq("id", editingDepartment.id);

        if (error) throw error;
        toast.success("Department updated successfully");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name: trimmed });

        if (error) throw error;
        toast.success("Department created successfully");
      }

      closeModal();
      fetchDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error(error.message || "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("Department deleted successfully");
      setDeleteTarget(null);
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Failed to delete department");
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
              Departments
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-rail border border-border text-xs font-mono font-medium text-ink-muted tabular-nums">
              {departments.length}
            </span>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Colleges, offices, and academic units submitting document requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Department</span>
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
          aria-label="Filter departments"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter departments…"
          className="input"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Ledger List */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredDepartments.length > 0 ? (
        <div className="card divide-y divide-border overflow-hidden">
          {filteredDepartments.map((department) => (
            <div
              key={department.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-canvas transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-md bg-maroon-50 border border-maroon-200 flex items-center justify-center shrink-0">
                  <Building2 size={17} className="text-maroon-700" />
                </div>
                <span className="font-medium text-sm text-ink truncate">
                  {department.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openModal(department)}
                  aria-label={`Edit ${department.name}`}
                  className="icon-btn hover:text-maroon-700"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(department)}
                  aria-label={`Delete ${department.name}`}
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
            icon={Building2}
            title={
              searchQuery ? "No matching departments" : "No departments yet"
            }
            description={
              searchQuery
                ? "Try clearing your search filter."
                : "Add an academic department or office to classify incoming tickets."
            }
            action={
              !searchQuery ? (
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="btn-primary"
                >
                  <Plus size={16} />
                  <span>Add Department</span>
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
        title={editingDepartment ? "Edit Department" : "Add Department"}
        closeDisabled={submitting}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="department-name" className="label">
              Department Name *
            </label>
            <input
              id="department-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              className="input"
              placeholder="e.g., College of Computer Studies"
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
              {submitting
                ? "Saving…"
                : editingDepartment
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Department"
        message={`Delete "${deleteTarget?.name}"? Existing tickets linked to this department will remain, with their department field cleared.`}
        confirmLabel="Delete Department"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default Departments;
