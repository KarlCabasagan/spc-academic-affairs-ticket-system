import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  UserCog,
  User,
  Shield,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronDown,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const Team = () => {
  const { isSuperAdmin, user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active, archived, all
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true }); // Order by creation to identify primary admin

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

  // Get the primary super admin (first created super_admin)
  const primarySuperAdmin = useMemo(() => {
    return team.find((m) => m.role === "super_admin");
  }, [team]);

  const updateUserRole = async (userId, newRole) => {
    if (!isSuperAdmin) return;

    // Prevent demoting the primary super admin
    if (userId === primarySuperAdmin?.id && newRole !== "super_admin") {
      toast.error("Cannot demote the primary super admin");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`Role updated to ${newRole.replace("_", " ")}`);
      fetchTeam();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const toggleArchive = async (member) => {
    if (!isSuperAdmin) return;

    // Prevent archiving the primary super admin
    if (member.id === primarySuperAdmin?.id) {
      toast.error("Cannot archive the primary super admin");
      return;
    }

    try {
      const newStatus = !member.is_archived;
      const { error } = await supabase
        .from("profiles")
        .update({ is_archived: newStatus, is_active: newStatus ? false : true })
        .eq("id", member.id);

      if (error) throw error;
      toast.success(
        newStatus
          ? "User archived and deactivated"
          : "User unarchived and activated",
      );
      fetchTeam();
    } catch (error) {
      console.error("Error toggling archive status:", error);
      toast.error("Failed to update status");
    }
  };

  const deleteUser = async (member) => {
    if (!isSuperAdmin || !member.is_archived) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete "${member.full_name}"? This action cannot be undone.`,
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", member.id);

      if (error) throw error;
      toast.success("User deleted permanently");
      fetchTeam();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredTeam = useMemo(() => {
    let filtered = team;

    // Apply status filter
    switch (filter) {
      case "active":
        filtered = filtered.filter((m) => !m.is_archived);
        break;
      case "archived":
        filtered = filtered.filter((m) => m.is_archived);
        break;
      default:
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.full_name?.toLowerCase().includes(q));
    }

    return filtered;
  }, [team, filter, searchQuery]);

  const getStatusBadge = (member) => {
    if (member.is_archived) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Archived
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">
        Active
      </span>
    );
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
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          className="input pl-12 w-full max-w-md"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
          { key: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.key
                ? "bg-maroon-700 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-75">
              (
              {
                team.filter((m) => {
                  switch (tab.key) {
                    case "active":
                      return !m.is_archived;
                    case "archived":
                      return m.is_archived;
                    default:
                      return true;
                  }
                }).length
              }
              )
            </span>
          </button>
        ))}
      </div>

      {/* Team List */}
      <div className="card">
        {filteredTeam.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredTeam.map((member) => {
              const isPrimaryAdmin = member.id === primarySuperAdmin?.id;
              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 gap-4"
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {member.full_name}
                        </p>
                        {isPrimaryAdmin && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-maroon-100 text-maroon-700 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(member)}
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === "super_admin"
                              ? "bg-maroon-100 text-maroon-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Shield size={12} />
                          {member.role === "super_admin"
                            ? "Super Admin"
                            : "Admin"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions - Only for super admin and not self */}
                  {isSuperAdmin && member.id !== user?.id && (
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      {/* Role Dropdown - Not for primary admin */}
                      {!member.is_archived && !isPrimaryAdmin && (
                        <div className="relative group">
                          <button className="btn-secondary text-sm flex items-center gap-1">
                            <span>
                              {member.role === "super_admin"
                                ? "Super Admin"
                                : "Admin"}
                            </span>
                            <ChevronDown size={14} />
                          </button>
                          <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => updateUserRole(member.id, "admin")}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                member.role === "admin"
                                  ? "text-maroon-700 font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              Admin
                            </button>
                            <button
                              onClick={() =>
                                updateUserRole(member.id, "super_admin")
                              }
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                member.role === "super_admin"
                                  ? "text-maroon-700 font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              Super Admin
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Archive/Unarchive - Not for primary admin */}
                      {!isPrimaryAdmin && (
                        <button
                          onClick={() => toggleArchive(member)}
                          className={`p-2 rounded-lg transition-colors ${
                            member.is_archived
                              ? "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              : "text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
                          }`}
                          title={
                            member.is_archived
                              ? "Unarchive & Activate"
                              : "Archive & Deactivate"
                          }
                        >
                          {member.is_archived ? (
                            <ArchiveRestore size={18} />
                          ) : (
                            <Archive size={18} />
                          )}
                        </button>
                      )}

                      {/* Delete (only for archived) */}
                      {member.is_archived && (
                        <button
                          onClick={() => deleteUser(member)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Self indicator */}
                  {member.id === user?.id && (
                    <span className="text-xs text-gray-400 italic">You</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <UserCog size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery
                ? "No team members match your search"
                : `No ${filter !== "all" ? filter : ""} team members`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;
