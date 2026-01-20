import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Pencil, Trash2, Users, X, Upload, User } from "lucide-react";
import toast from "react-hot-toast";

const Personnel = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [formData, setFormData] = useState({ name: "", avatar_url: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchPersonnel = async () => {
    try {
      const { data, error } = await supabase
        .from("personnel")
        .select("*")
        .order("name");

      if (error) throw error;
      setPersonnel(data || []);
    } catch (error) {
      console.error("Error fetching personnel:", error);
      toast.error("Failed to load personnel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const openModal = (person = null) => {
    setEditingPersonnel(person);
    setFormData({
      name: person?.name || "",
      avatar_url: person?.avatar_url || "",
    });
    setAvatarPreview(person?.avatar_url || null);
    setAvatarFile(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPersonnel(null);
    setFormData({ name: "", avatar_url: "" });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `personnel-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      let avatarUrl = formData.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const data = {
        name: formData.name.trim(),
        avatar_url: avatarUrl,
      };

      if (editingPersonnel) {
        const { error } = await supabase
          .from("personnel")
          .update(data)
          .eq("id", editingPersonnel.id);

        if (error) throw error;
        toast.success("Personnel updated successfully");
      } else {
        const { error } = await supabase.from("personnel").insert(data);

        if (error) throw error;
        toast.success("Personnel created successfully");
      }

      closeModal();
      fetchPersonnel();
    } catch (error) {
      console.error("Error saving personnel:", error);
      toast.error(error.message || "Failed to save personnel");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (person) => {
    if (!confirm(`Are you sure you want to delete "${person.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("personnel")
        .delete()
        .eq("id", person.id);

      if (error) throw error;
      toast.success("Personnel deleted successfully");
      fetchPersonnel();
    } catch (error) {
      console.error("Error deleting personnel:", error);
      toast.error("Failed to delete personnel");
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
          <h1 className="text-2xl font-bold text-gray-900">Personnel</h1>
          <p className="text-gray-500 mt-1">
            Manage staff who receive documents.
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus size={18} />
          <span>Add Personnel</span>
        </button>
      </div>

      {/* Grid */}
      {personnel.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {personnel.map((person) => (
            <div key={person.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={28} className="text-gray-400" />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(person)}
                    className="p-2 text-gray-500 hover:text-maroon-700 hover:bg-maroon-50 rounded-lg transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(person)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{person.name}</h3>
              <p className="text-sm text-gray-500 mt-1">Staff Member</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Users size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No personnel yet</p>
          <button
            onClick={() => openModal()}
            className="text-maroon-700 hover:text-maroon-800 text-sm font-medium mt-2"
          >
            Add your first personnel
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slideUp">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPersonnel ? "Edit Personnel" : "Add Personnel"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              {/* Avatar Upload */}
              <div className="mb-6">
                <label className="label">Photo</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Upload size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary text-sm"
                    >
                      Upload Photo
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Max 2MB, JPG or PNG
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label htmlFor="name" className="label">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  placeholder="Enter full name"
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
                    : editingPersonnel
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

export default Personnel;
