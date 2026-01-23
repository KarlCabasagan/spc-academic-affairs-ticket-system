import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogIn } from "lucide-react";

const PublicLayout = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-maroon-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">SPC</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-gray-900">
                  Office of the Vice President for Academic Affairs
                </h1>
                <p className="text-xs text-gray-500">Ticket Tracking System</p>
              </div>
            </Link>

            {/* Auth Button */}
            {user ? (
              <Link to="/admin/dashboard" className="btn-primary">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary">
                <LogIn size={18} />
                <span>Staff Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} SPC Academic Affairs. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
