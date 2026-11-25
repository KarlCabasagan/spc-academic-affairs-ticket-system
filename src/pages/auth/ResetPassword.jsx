import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
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

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md card p-8 text-center">
          <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Verifying recovery session…</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center animate-slideUp">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid or Expired Link
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              This password reset link is invalid, expired, or has already been
              used. Please request a new reset link from the login page.
            </p>
            <Link to="/login" className="btn-primary w-full">
              <ArrowLeft size={18} />
              <span>Return to Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center animate-slideUp">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Password Updated!
            </h1>
            <p className="text-gray-500 mb-4">
              Redirecting you to the dashboard…
            </p>
            <div className="w-8 h-8 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-maroon-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Login</span>
        </Link>

        <div className="card p-8 animate-slideUp">
          <div className="text-center mb-8">
            <img
              src="/icon-192.png"
              alt="SPC Logo"
              className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              Set New Password
            </h1>
            <p className="text-gray-500 mt-2">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={18} />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          SPC Academic Affairs Ticket System
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
