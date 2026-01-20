import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Pencil, Trash2, Building2, X } from "lucide-react";
import toast from "react-hot-toast";

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

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
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from("departments")
          .update({ name: formData.name.trim() })
          .eq("id", editingDepartment.id);

        if (error) throw error;
        toast.success("Department updated successfully");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name: formData.name.trim() });

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

  const handleDelete = async (department) => {
    if (!confirm(`Are you sure you want to delete "${department.name}"?`))
      return;

    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", department.id);

      if (error) throw error;
      toast.success("Department deleted successfully");
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Failed to delete department");
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">
            Manage origin departments for tickets.
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus size={18} />
          <span>Add Department</span>
        </button>
      </div>

      {/* List */}
      <div className="card">
        {departments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {departments.map((department) => (
              <div
                key={department.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-maroon-100 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-maroon-700" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {department.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(department)}
                    className="p-2 text-gray-500 hover:text-maroon-700 hover:bg-maroon-50 rounded-lg transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(department)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No departments yet</p>
            <button
              onClick={() => openModal()}
              className="text-maroon-700 hover:text-maroon-800 text-sm font-medium mt-2"
            >
              Add your first department
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slideUp">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDepartment ? "Edit Department" : "Add Department"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label htmlFor="name" className="label">
                  Department Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="input"
                  placeholder="e.g., College of Computer Studies"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting
                    ? "Saving..."
                    : editingDepartment
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
