import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
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

const Team = () => {
  const { isSuperAdmin, user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active, archived, all
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const menuContainerRef = useRef(null);

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

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

  useEffect(() => {
    if (!openMenuId) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    const handlePointerDown = (e) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target)
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenuId]);

  const primarySuperAdmin = useMemo(() => {
    return team.find((m) => m.role === "super_admin");
  }, [team]);

  const updateUserRole = async (userId, newRole) => {
    if (!isSuperAdmin || busyMemberId) return;

    if (userId === primarySuperAdmin?.id && newRole !== "super_admin") {
      toast.error("Cannot demote the primary super admin");
      return;
    }

    setOpenMenuId(null);
    setBusyMemberId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`Role updated to ${newRole.replace("_", " ")}`);
      await fetchTeam();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setBusyMemberId(null);
    }
  };

  const toggleArchive = async (member) => {
    if (!isSuperAdmin || busyMemberId) return;

    if (member.id === primarySuperAdmin?.id) {
      toast.error("Cannot archive the primary super admin");
      return;
    }

    setBusyMemberId(member.id);
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
      await fetchTeam();
    } catch (error) {
      console.error("Error toggling archive status:", error);
      toast.error("Failed to update status");
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isSuperAdmin || !deleteTarget?.is_archived || busyMemberId) return;

    setBusyMemberId(deleteTarget.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("User deleted permanently");
      setDeleteTarget(null);
      await fetchTeam();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setBusyMemberId(null);
    }
  };

  const filteredTeam = useMemo(() => {
    let filtered = team;

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

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((m) => {
        const name = (m.full_name || "").toLowerCase();
        const roleLabel = m.role === "super_admin" ? "super admin" : "admin";
        return name.includes(q) || roleLabel.includes(q);
      });
    }

    return filtered;
  }, [team, filter, searchQuery]);

  const counts = useMemo(
    () => ({
      active: team.filter((m) => !m.is_archived).length,
      archived: team.filter((m) => m.is_archived).length,
      all: team.length,
    }),
    [team],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Team &amp; Access
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Manage OVPAA administrator roles, archive inactive staff, and protect
          system access.
        </p>
      </div>

      {/* Search & Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
          />
          <input
            type="text"
            aria-label="Search team members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or role…"
            className="input"
            style={{ paddingLeft: "2.5rem" }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter team accounts"
          className="flex items-center gap-1.5"
        >
          {[
            { key: "active", label: "Active", count: counts.active },
            { key: "archived", label: "Archived", count: counts.archived },
            { key: "all", label: "All", count: counts.all },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-md text-xs font-semibold cursor-pointer ${
                  active
                    ? "bg-maroon-700 text-white"
                    : "bg-surface border border-border text-ink-muted hover:text-ink hover:bg-rail/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-rail text-ink-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Team Ledger */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredTeam.length > 0 ? (
        <div className="card divide-y divide-border">
          {filteredTeam.map((member) => {
            const isPrimaryAdmin = member.id === primarySuperAdmin?.id;
            const isBusy = busyMemberId === member.id;
            const isMenuOpen = openMenuId === member.id;
            const displayName = member.full_name || "Unnamed User";

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-canvas transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-rail border border-border rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={19} className="text-ink-subtle" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-ink truncate">
                        {displayName}
                      </p>
                      {isPrimaryAdmin && (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-maroon-50 border border-maroon-200 text-maroon-700 rounded-full">
                          Primary
                        </span>
                      )}
                      {member.id === user?.id && (
                        <span className="text-xs text-ink-muted">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {member.is_archived ? (
                        <span className="badge">Archived</span>
                      ) : (
                        <span className="badge-approved">Active</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          member.role === "super_admin"
                            ? "bg-maroon-50 text-maroon-700 border-maroon-200"
                            : "bg-rail text-ink-muted border-border"
                        }`}
                      >
                        <Shield size={11} />
                        {member.role === "super_admin"
                          ? "Super Admin"
                          : "Admin"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isSuperAdmin && member.id !== user?.id && (
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    {!member.is_archived && !isPrimaryAdmin && (
                      <div
                        className="relative"
                        ref={isMenuOpen ? menuContainerRef : null}
                      >
                        <button
                          type="button"
                          disabled={isBusy}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          onClick={() =>
                            setOpenMenuId(isMenuOpen ? null : member.id)
                          }
                          className="btn-secondary min-h-[38px] px-3 py-1.5 text-xs"
                        >
                          <span>
                            {member.role === "super_admin"
                              ? "Super Admin"
                              : "Admin"}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-150 ${
                              isMenuOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isMenuOpen && (
                          <div
                            role="menu"
                            aria-label={`Change role for ${displayName}`}
                            className="absolute right-0 mt-1.5 w-40 bg-surface border border-border rounded-lg shadow-[var(--shadow-dropdown)] py-1 z-20 origin-top-right animate-popover"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => updateUserRole(member.id, "admin")}
                              className={`w-full px-3.5 py-2 text-left text-xs hover:bg-rail transition-colors cursor-pointer ${
                                member.role === "admin"
                                  ? "text-maroon-700 font-semibold"
                                  : "text-ink"
                              }`}
                            >
                              Admin
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() =>
                                updateUserRole(member.id, "super_admin")
                              }
                              className={`w-full px-3.5 py-2 text-left text-xs hover:bg-rail transition-colors cursor-pointer ${
                                member.role === "super_admin"
                                  ? "text-maroon-700 font-semibold"
                                  : "text-ink"
                              }`}
                            >
                              Super Admin
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!isPrimaryAdmin && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleArchive(member)}
                        className={`icon-btn ${
                          member.is_archived
                            ? "hover:text-[#1e40af] hover:bg-[#eff4fb]"
                            : "hover:text-[#92400e] hover:bg-[#fef9ec]"
                        }`}
                        aria-label={
                          member.is_archived
                            ? `Unarchive ${displayName}`
                            : `Archive ${displayName}`
                        }
                        title={
                          member.is_archived
                            ? "Unarchive & Activate"
                            : "Archive & Deactivate"
                        }
                      >
                        {member.is_archived ? (
                          <ArchiveRestore size={17} />
                        ) : (
                          <Archive size={17} />
                        )}
                      </button>
                    )}

                    {member.is_archived && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDeleteTarget(member)}
                        className="icon-btn hover:text-[#991b1b] hover:bg-[#fdf1f1]"
                        aria-label={`Delete ${displayName} permanently`}
                        title="Delete permanently"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={UserCog}
            title={
              searchQuery
                ? "No matching team members"
                : `No ${filter !== "all" ? filter : ""} accounts`
            }
            description={
              searchQuery
                ? "Try clearing your search input."
                : "Accounts appear here once staff members register on the portal."
            }
          />
        </div>
      )}

      {/* Permanent Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Archived Account"
        message={`Permanently remove "${deleteTarget?.full_name || "this user"}" from the profiles directory? This cannot be undone.`}
        confirmLabel="Delete Account"
        variant="danger"
        loading={Boolean(busyMemberId && deleteTarget)}
      />
    </div>
  );
};

export default Team;
