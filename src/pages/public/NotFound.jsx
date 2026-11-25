import { Link } from "react-router-dom";
import { Search, LayoutDashboard, ArrowLeft, FileWarning } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 bg-maroon-50 border border-maroon-200 rounded-xl flex items-center justify-center mx-auto mb-6">
          <FileWarning size={26} className="text-maroon-700" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-maroon-700 mb-2">
          Error 404
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8 max-w-sm mx-auto">
          The page or ticket route you requested does not exist or may have been
          moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="btn-primary w-full sm:w-auto">
            <Search size={18} />
            <span>Document Tracker</span>
          </Link>
          {user ? (
            <Link
              to="/admin/dashboard"
              className="btn-secondary w-full sm:w-auto"
            >
              <LayoutDashboard size={18} />
              <span>Admin Dashboard</span>
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary w-full sm:w-auto">
              <ArrowLeft size={18} />
              <span>Staff Login</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
