import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LogIn, ArrowUpRight } from "lucide-react";

const PublicLayout = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-canvas text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/95 backdrop-blur-sm print:hidden">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 min-w-0 focus-ring rounded-md py-1"
          >
            <img
              src="/icon-192.png"
              alt="St. Peter's College 1952 Crest"
              className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-ink leading-tight truncate">
                St. Peter&apos;s College
              </p>
              <p className="text-xs text-ink-muted truncate hidden sm:block">
                Office of the Vice President for Academic Affairs
              </p>
              <p className="text-xs text-ink-muted truncate sm:hidden">
                OVPAA Document Registry
              </p>
            </div>
          </Link>

          <div className="shrink-0">
            {user ? (
              <Link to="/admin/dashboard" className="btn-primary">
                <span>Open Dashboard</span>
                <ArrowUpRight size={16} />
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary">
                <LogIn size={16} />
                <span>Staff Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-rail/60 py-5 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-muted">
          <p>
            © {new Date().getFullYear()} St. Peter&apos;s College · Iligan City
            (Est. 1952)
          </p>
          <p>OVPAA Academic Affairs Document Tracking Registry</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
