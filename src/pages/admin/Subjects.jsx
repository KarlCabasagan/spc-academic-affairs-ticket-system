import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Pencil, Trash2, Tags, X } from "lucide-react";
import toast from "react-hot-toast";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

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
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update({ name: formData.name.trim() })
          .eq("id", editingSubject.id);

        if (error) throw error;
        toast.success("Subject updated successfully");
      } else {
        const { error } = await supabase
          .from("subjects")
          .insert({ name: formData.name.trim() });

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

  const handleDelete = async (subject) => {
    if (!confirm(`Are you sure you want to delete "${subject.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subject.id);

      if (error) throw error;
      toast.success("Subject deleted successfully");
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
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
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 mt-1">
            Manage ticket categories and subjects.
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus size={18} />
          <span>Add Subject</span>
        </button>
      </div>

      {/* List */}
      <div className="card">
        {subjects.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Tags size={20} className="text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {subject.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(subject)}
                    className="p-2 text-gray-500 hover:text-maroon-700 hover:bg-maroon-50 rounded-lg transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject)}
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
            <Tags size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No subjects yet</p>
            <button
              onClick={() => openModal()}
              className="text-maroon-700 hover:text-maroon-800 text-sm font-medium mt-2"
            >
              Add your first subject
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
                {editingSubject ? "Edit Subject" : "Add Subject"}
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
                  Subject Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="input"
                  placeholder="e.g., Grade Correction"
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
                    : editingSubject
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

export default Subjects;
