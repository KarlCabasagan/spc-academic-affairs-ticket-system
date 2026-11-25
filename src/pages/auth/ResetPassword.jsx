import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { SkeletonBlock } from "../../components/ui/Skeleton";
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const hasRecoveryUrlParams = () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get("type") === "recovery" ||
    Boolean(hashParams.get("access_token")) ||
    searchParams.get("type") === "recovery" ||
    Boolean(searchParams.get("code"))
  );
};

const AuthSplitShell = ({ children }) => (
  <div className="min-h-[100dvh] grid lg:grid-cols-12 bg-canvas text-ink">
    <aside className="hidden lg:flex lg:col-span-5 bg-maroon-900 text-white flex-col justify-between p-10 xl:p-12 border-r border-maroon-950">
      <div className="flex items-center gap-3.5">
        <img
          src="/icon-192.png"
          alt="St. Peter's College 1952 Crest"
          className="w-12 h-12 rounded-full object-cover border border-white/25 shrink-0"
        />
        <div>
          <p className="font-semibold text-base tracking-tight">
            St. Peter&apos;s College
          </p>
          <p className="text-xs text-maroon-200">Iligan City · Est. 1952</p>
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        <h2 className="text-3xl font-bold tracking-tight leading-tight text-white">
          Account Recovery
        </h2>
        <p className="text-sm text-maroon-100 leading-relaxed prose-measure">
          Complete your OVPAA staff password reset to restore access to ticket
          management and monthly reporting tools.
        </p>
      </div>

      <div className="pt-6 border-t border-white/15 flex items-center justify-between text-xs text-maroon-200">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-white hover:text-maroon-100 font-medium transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to Sign In</span>
        </Link>
        <span>OVPAA Registry</span>
      </div>
    </aside>

    <main className="lg:col-span-7 flex flex-col justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between lg:hidden">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-maroon-700"
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
          <img
            src="/icon-192.png"
            alt="SPC Crest"
            className="w-9 h-9 rounded-full object-cover border border-border"
          />
        </div>
        {children}
      </div>
    </main>
  </div>
);

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hadRecoveryParams] = useState(() => hasRecoveryUrlParams());

  const redirectTimerRef = useRef(null);
  const {
    updatePassword,
    user,
    loading: authLoading,
    isRecoverySession,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const hasValidSession = Boolean(user || isRecoverySession);
  const isWaitingForRecovery = authLoading && hadRecoveryParams;
  const passwordMismatch =
    Boolean(confirmPassword) && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      toast.success("Password updated successfully!");

      redirectTimerRef.current = setTimeout(() => {
        navigate("/admin/dashboard", { replace: true });
      }, 1800);
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isWaitingForRecovery) {
    return (
      <AuthSplitShell>
        <div
          className="card p-6 sm:p-8 space-y-4"
          aria-busy="true"
          aria-label="Verifying recovery session"
        >
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-64" />
          <SkeletonBlock className="h-11 w-full" />
          <SkeletonBlock className="h-11 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </AuthSplitShell>
    );
  }

  if (!hasValidSession) {
    return (
      <AuthSplitShell>
        <div className="card p-6 sm:p-8 text-center animate-fadeIn">
          <div className="w-12 h-12 bg-[#fdf1f1] border border-[#f4c5c5] rounded-lg flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={22} className="text-[#991b1b]" />
          </div>
          <h1 className="text-xl font-bold text-ink mb-2">
            Invalid or Expired Link
          </h1>
          <p className="text-sm text-ink-muted mb-6 prose-measure mx-auto">
            This password reset link is invalid, expired, or has already been
            used. Request a fresh link from the staff login page.
          </p>
          <Link to="/login" className="btn-primary w-full">
            <ArrowLeft size={16} />
            <span>Return to Staff Login</span>
          </Link>
        </div>
      </AuthSplitShell>
    );
  }

  if (success) {
    return (
      <AuthSplitShell>
        <div className="card p-6 sm:p-8 text-center animate-fadeIn">
          <div className="w-12 h-12 bg-[#eef7f1] border border-[#bfe0ca] rounded-lg flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={22} className="text-[#166534]" />
          </div>
          <h1 className="text-xl font-bold text-ink mb-2">Password Updated</h1>
          <p className="text-sm text-ink-muted mb-5">
            Redirecting you to the OVPAA dashboard…
          </p>
          <Link to="/admin/dashboard" className="btn-primary w-full">
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell>
      <div className="card p-6 sm:p-8 animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Set New Password
          </h1>
          <p className="text-sm text-ink-muted mt-1.5">
            Choose a strong password of at least 6 characters for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="label">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-12"
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input pr-12 ${passwordMismatch ? "input-error" : ""}`}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={
                  showConfirm
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordMismatch && (
              <p className="text-xs text-[#b91c1c] mt-1.5">
                Passwords do not match.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || passwordMismatch}
            className="btn-primary w-full mt-2"
          >
            {loading ? (
              <span>Updating…</span>
            ) : (
              <>
                <KeyRound size={16} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </AuthSplitShell>
  );
};

export default ResetPassword;
