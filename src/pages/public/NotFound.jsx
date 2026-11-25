import { Link } from "react-router-dom";
import { Search, LayoutDashboard, ArrowLeft, FileWarning } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="card max-w-md w-full p-8 text-center animate-fadeIn">
        <div className="w-12 h-12 bg-maroon-50 border border-maroon-200 rounded-lg flex items-center justify-center mx-auto mb-5">
          <FileWarning size={22} className="text-maroon-700" />
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight mb-2.5 tabular-nums">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-ink-muted mb-7 max-w-[40ch] mx-auto leading-relaxed">
          The page or ticket route you requested does not exist or may have been
          moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="btn-primary w-full sm:w-auto">
            <Search size={16} />
            <span>Document Tracker</span>
          </Link>
          {user ? (
            <Link
              to="/admin/dashboard"
              className="btn-secondary w-full sm:w-auto"
            >
              <LayoutDashboard size={16} />
              <span>Admin Dashboard</span>
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary w-full sm:w-auto">
              <ArrowLeft size={16} />
              <span>Staff Portal</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
