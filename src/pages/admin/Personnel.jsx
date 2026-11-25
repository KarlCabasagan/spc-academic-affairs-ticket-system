import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  validateAvatarFile,
  uploadAvatarFile,
  removeAvatarByUrl,
} from "../../lib/storageUtils";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { CardGridSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { Plus, Pencil, Trash2, Users, Upload, User, Search } from "lucide-react";
import toast from "react-hot-toast";

const Personnel = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [formData, setFormData] = useState({ name: "", avatar_url: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const blobUrlRef = useRef(null);

  const revokeBlobPreview = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeBlobPreview();
    };
  }, []);

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

  const filteredPersonnel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return personnel;
    return personnel.filter((p) => p.name.toLowerCase().includes(q));
  }, [personnel, searchQuery]);

  const openModal = (person = null) => {
    revokeBlobPreview();
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
    revokeBlobPreview();
    setModalOpen(false);
    setEditingPersonnel(null);
    setFormData({ name: "", avatar_url: "" });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = "";
      return;
    }

    revokeBlobPreview();
    const objectUrl = URL.createObjectURL(file);
    blobUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error("Please enter a full name");
      return;
    }

    setSubmitting(true);
    let newlyUploadedUrl = null;
    const previousAvatarUrl = editingPersonnel?.avatar_url || null;

    try {
      let avatarUrl = formData.avatar_url || null;

      if (avatarFile) {
        const uploaded = await uploadAvatarFile(
          supabase,
          avatarFile,
          "personnel",
        );
        newlyUploadedUrl = uploaded.publicUrl;
        avatarUrl = uploaded.publicUrl;
      }

      const payload = {
        name: trimmedName,
        avatar_url: avatarUrl,
      };

      if (editingPersonnel) {
        const { error } = await supabase
          .from("personnel")
          .update(payload)
          .eq("id", editingPersonnel.id);

        if (error) throw error;
        toast.success("Personnel updated successfully");
      } else {
        const { error } = await supabase.from("personnel").insert(payload);

        if (error) throw error;
        toast.success("Personnel created successfully");
      }

      if (newlyUploadedUrl && previousAvatarUrl) {
        await removeAvatarByUrl(supabase, previousAvatarUrl);
      }

      closeModal();
      fetchPersonnel();
    } catch (error) {
      console.error("Error saving personnel:", error);
      if (newlyUploadedUrl) {
        await removeAvatarByUrl(supabase, newlyUploadedUrl);
      }
      toast.error(error.message || "Failed to save personnel");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("personnel")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      if (deleteTarget.avatar_url) {
        await removeAvatarByUrl(supabase, deleteTarget.avatar_url);
      }

      toast.success("Personnel deleted successfully");
      setDeleteTarget(null);
      fetchPersonnel();
    } catch (error) {
      console.error("Error deleting personnel:", error);
      toast.error("Failed to delete personnel");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              Receiving Personnel
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-rail border border-border text-xs font-mono font-medium text-ink-muted tabular-nums">
              {personnel.length}
            </span>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Staff members shown as document receivers on public tracking slips.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Personnel</span>
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
          aria-label="Filter personnel"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter personnel by name…"
          className="input"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Directory Grid */}
      {loading ? (
        <CardGridSkeleton cards={6} />
      ) : filteredPersonnel.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonnel.map((person) => (
            <div
              key={person.id}
              className="card p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 bg-rail border border-border rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-ink-subtle" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-ink truncate">
                    {person.name}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Receiving Officer
                  </p>
                </div>
              </div>
              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => openModal(person)}
                  aria-label={`Edit ${person.name}`}
                  className="icon-btn hover:text-maroon-700"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(person)}
                  aria-label={`Delete ${person.name}`}
                  className="icon-btn hover:text-[#991b1b] hover:bg-[#fdf1f1]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Users}
            title={
              searchQuery ? "No matching personnel" : "No personnel added yet"
            }
            description={
              searchQuery
                ? "Try clearing your search filter."
                : "Add receiving staff members so tickets can record who accepted each document."
            }
            action={
              !searchQuery ? (
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="btn-primary"
                >
                  <Plus size={16} />
                  <span>Add Personnel</span>
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
        title={editingPersonnel ? "Edit Personnel" : "Add Personnel"}
        closeDisabled={submitting}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Photo</label>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 bg-rail border border-border rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:border-border-strong transition-colors shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload size={20} className="text-ink-subtle" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs"
                >
                  Upload Photo
                </button>
                <p className="text-xs text-ink-muted mt-1.5">
                  Max 2MB · JPG, PNG, or WebP
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="personnel-name" className="label">
              Full Name *
            </label>
            <input
              id="personnel-name"
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

          <div className="flex items-center justify-end gap-3 pt-1">
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
              {submitting ? "Saving…" : editingPersonnel ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Personnel"
        message={`Remove "${deleteTarget?.name}" from receiving personnel? Existing tickets assigned to them will remain in the registry.`}
        confirmLabel="Delete Personnel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default Personnel;
