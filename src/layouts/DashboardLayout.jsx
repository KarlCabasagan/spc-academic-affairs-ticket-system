import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Building2,
  Tags,
  Users,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const MAIN_NAVIGATION = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "All Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Create Ticket", href: "/admin/tickets/create", icon: PlusCircle },
  { name: "Reports", href: "/admin/reports", icon: FileSpreadsheet },
];

const ADMIN_NAVIGATION = [
  { name: "Departments", href: "/admin/departments", icon: Building2 },
  { name: "Subjects", href: "/admin/subjects", icon: Tags },
  { name: "Personnel", href: "/admin/personnel", icon: Users },
  { name: "Team", href: "/admin/team", icon: UserCog },
];

const isRouteActive = (pathname, href) => {
  if (href === "/admin/tickets") {
    return (
      pathname === "/admin/tickets" ||
      (pathname.startsWith("/admin/tickets/") &&
        !pathname.startsWith("/admin/tickets/create"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

const getPageTitle = (pathname) => {
  if (pathname.startsWith("/admin/tickets/create")) return "Create Ticket";
  if (pathname.startsWith("/admin/tickets/")) return "Ticket Details";
  if (pathname.startsWith("/admin/profile")) return "Profile Settings";

  const match = [...MAIN_NAVIGATION, ...ADMIN_NAVIGATION].find((item) =>
    isRouteActive(pathname, item.href),
  );
  return match?.name || "OVPAA Console";
};

const SidebarNavLink = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-[background-color,color,border-color] duration-150 ${
        active
          ? "bg-surface text-maroon-700 border border-border font-semibold"
          : "text-ink-muted border border-transparent hover:bg-surface/65 hover:text-ink font-medium"
      }`}
    >
      <Icon
        size={18}
        className={active ? "text-maroon-700 shrink-0" : "text-ink-subtle shrink-0"}
      />
      <span>{item.name}</span>
    </Link>
  );
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setProfileDropdownOpen(false);
        setSidebarOpen(false);
      }
    };

    const handlePointerDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#171614]/45 z-40 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Recessed Archival Sidebar Rail */}
      <aside
        aria-label="Primary navigation"
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-rail border-r border-border flex flex-col transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border bg-rail shrink-0">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 min-w-0 focus-ring rounded-md py-1"
          >
            <img
              src="/icon-192.png"
              alt="St. Peter's College Crest"
              className="w-9 h-9 rounded-full object-cover border border-border-strong shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm leading-tight truncate">
                SPC · OVPAA
              </p>
              <p className="text-xs text-ink-muted truncate">Ticket Registry</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden icon-btn -mr-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {MAIN_NAVIGATION.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                active={isRouteActive(location.pathname, item.href)}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </div>

          {isSuperAdmin && (
            <div className="pt-5">
              <p className="eyebrow px-3 pb-2">Configuration</p>
              <div className="space-y-1">
                {ADMIN_NAVIGATION.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    item={item}
                    active={isRouteActive(location.pathname, item.href)}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-5">
            <p className="eyebrow px-3 pb-2">Account</p>
            <SidebarNavLink
              item={{
                name: "Profile",
                href: "/admin/profile",
                icon: Settings,
              }}
              active={isRouteActive(location.pathname, "/admin/profile")}
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border shrink-0">
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-ink-muted hover:bg-surface/70 hover:text-ink transition-colors"
          >
            <span>Public Document Tracker</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64 min-h-[100dvh] flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-surface/95 backdrop-blur-sm border-b border-border shrink-0">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
                className="lg:hidden icon-btn -ml-2"
              >
                <Menu size={20} />
              </button>
              <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                {pageTitle}
              </h2>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={profileDropdownOpen}
                className="flex items-center gap-2.5 px-2.5 py-1.5 min-h-[44px] rounded-md hover:bg-rail transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 bg-maroon-50 border border-maroon-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-maroon-700" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-ink leading-tight">
                    {profile?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-ink-muted leading-tight">
                    {profile?.role === "super_admin" ? "Super Admin" : "Admin"}
                  </p>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-ink-subtle transition-transform duration-150 ${
                    profileDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileDropdownOpen && (
                <div
                  role="menu"
                  aria-label="Account menu"
                  className="absolute right-0 mt-1.5 w-56 bg-surface rounded-lg shadow-[var(--shadow-dropdown)] border border-border py-1.5 z-50 origin-top-right animate-popover"
                >
                  <div className="px-3.5 py-2 border-b border-border sm:hidden">
                    <p className="text-sm font-medium text-ink truncate">
                      {profile?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {profile?.role === "super_admin"
                        ? "Super Admin"
                        : "Admin"}
                    </p>
                  </div>
                  <Link
                    to="/admin/profile"
                    role="menuitem"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-rail transition-colors"
                  >
                    <Settings size={16} className="text-ink-muted" />
                    <span>Profile Settings</span>
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#b91c1c] hover:bg-[#fdf1f1] w-full text-left transition-colors cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
