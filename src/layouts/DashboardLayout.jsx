import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
} from "lucide-react";
import toast from "react-hot-toast";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "All Tickets", href: "/admin/tickets", icon: Ticket },
    { name: "Create Ticket", href: "/admin/tickets/create", icon: PlusCircle },
    { name: "Reports", href: "/admin/reports", icon: FileSpreadsheet },
  ];

  const adminNavigation = [
    { name: "Departments", href: "/admin/departments", icon: Building2 },
    { name: "Subjects", href: "/admin/subjects", icon: Tags },
    { name: "Personnel", href: "/admin/personnel", icon: Users },
    { name: "Team", href: "/admin/team", icon: UserCog },
  ];

  const isActive = (href) => location.pathname === href;

  const NavLink = ({ item, onClick }) => (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive(item.href)
          ? "bg-maroon-700 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <item.icon size={20} />
      <span>{item.name}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <img
              src="/icon-192.png"
              alt="SPC Logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">OVPAA</h1>
              <p className="text-xs text-gray-500">Ticket System</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </div>

          {/* Admin Section */}
          {isSuperAdmin && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Configuration
                </p>
              </div>
              <div className="space-y-1">
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    item={item}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Settings */}
          <div className="pt-6 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Account
            </p>
          </div>
          <NavLink
            item={{ name: "Profile", href: "/admin/profile", icon: Settings }}
            onClick={() => setSidebarOpen(false)}
          />
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={20} className="text-gray-600" />
            </button>

            {/* Page Title - Hidden on mobile */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-gray-900">
                {navigation.find((n) => isActive(n.href))?.name ||
                  adminNavigation.find((n) => isActive(n.href))?.name ||
                  (isActive("/admin/profile") ? "Profile" : "")}
              </h2>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-maroon-100 rounded-full flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-maroon-700" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {profile?.role?.replace("_", " ")}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${
                      profileDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-gray-100 py-2 z-50 animate-fadeIn">
                      <Link
                        to="/admin/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings size={18} />
                        <span>Profile Settings</span>
                      </Link>
                      <hr className="my-2 border-gray-100" />
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
