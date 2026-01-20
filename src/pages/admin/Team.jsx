import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Plus, UserCog, User, Shield, X } from "lucide-react";
import toast from "react-hot-toast";

const Team = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeam(data || []);
    } catch (error) {
      console.error("Error fetching team:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ email: "", password: "", fullName: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName) return;

    setSubmitting(true);
    try {
      // Create new user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      toast.success("Admin account created! They can now sign in.");
      closeModal();
      fetchTeam();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Failed to create admin account");
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">
            Manage admin accounts and access.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          <span>Add Admin</span>
        </button>
      </div>

      {/* Team List */}
      <div className="card">
        {team.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={22} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.full_name}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {member.role?.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    member.role === "super_admin"
                      ? "bg-maroon-100 text-maroon-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Shield size={14} />
                  <span>
                    {member.role === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <UserCog size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No team members yet</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slideUp">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Admin</h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="fullName" className="label">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="input"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="input"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="pt-2 flex gap-3">
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
                  {submitting ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
