import { useState } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowLeft,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const Login = () => {
  const [mode, setMode] = useState("login"); // login, signup, forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    signIn,
    signUp,
    resetPassword,
    user,
    profile,
    loading: authLoading,
    profileLoading,
    authNotice,
    clearAuthNotice,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin/dashboard";
  const disabledNotice =
    authNotice ||
    (location.state?.disabledAccount
      ? "Your account has been deactivated or archived. Please contact a Super Admin."
      : null);

  if (
    !authLoading &&
    !profileLoading &&
    user &&
    profile &&
    !profile.is_archived &&
    profile.is_active !== false
  ) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAuthNotice();
    setLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Welcome back!");
        navigate(from, { replace: true });
      } else if (mode === "signup") {
        await signUp(email, password, fullName);
        toast.success("Account created! Please check your email to verify.");
        navigate(from, { replace: true });
      } else if (mode === "forgot") {
        await resetPassword(email);
        toast.success("Password reset link sent! Check your email.");
        setMode("login");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "signup":
        return "Create Staff Account";
      case "forgot":
        return "Reset Password";
      default:
        return "Staff Portal Sign In";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "signup":
        return "Register an Academic Affairs staff profile to log and route tickets.";
      case "forgot":
        return "Enter your institutional email address to receive a recovery link.";
      default:
        return "Sign in with your OVPAA staff credentials to continue.";
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-12 bg-canvas text-ink">
      {/* Left Institutional Panel */}
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
            Office of the Vice President for Academic Affairs
          </h2>
          <p className="text-sm text-maroon-100 leading-relaxed prose-measure">
            Centralized intake console for logging document requests, assigning
            receiving personnel, updating routing decisions, and generating
            monthly OVPAA summary workbooks.
          </p>
        </div>

        <div className="pt-6 border-t border-white/15 flex items-center justify-between text-xs text-maroon-200">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white hover:text-maroon-100 font-medium transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Public Document Tracker</span>
          </Link>
          <span>OVPAA Registry</span>
        </div>
      </aside>

      {/* Right Auth Form Column */}
      <main className="lg:col-span-7 flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Mobile Back + Crest */}
          <div className="flex items-center justify-between lg:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-maroon-700"
            >
              <ArrowLeft size={16} />
              <span>Document Tracker</span>
            </Link>
            <img
              src="/icon-192.png"
              alt="SPC Crest"
              className="w-9 h-9 rounded-full object-cover border border-border"
            />
          </div>

          <div className="card p-6 sm:p-8 animate-fadeIn">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-ink tracking-tight">
                {getTitle()}
              </h1>
              <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                {getSubtitle()}
              </p>
            </div>

            {disabledNotice && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-md bg-[#fdf1f1] border border-[#f4c5c5] text-sm text-[#991b1b] flex items-start gap-2.5"
              >
                <AlertCircle size={17} className="shrink-0 mt-0.5" />
                <span>{disabledNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="fullName" className="label">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="name@spc.edu.ph"
                  required
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="label mb-0">
                      Password
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-maroon-700 hover:text-maroon-800 font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-12"
                      placeholder="Enter your password"
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
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? (
                  <span>Please wait…</span>
                ) : (
                  <>
                    {mode === "login" && <LogIn size={16} />}
                    {mode === "signup" && <UserPlus size={16} />}
                    {mode === "forgot" && <KeyRound size={16} />}
                    <span>
                      {mode === "login" && "Sign In"}
                      {mode === "signup" && "Create Account"}
                      {mode === "forgot" && "Send Reset Link"}
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-maroon-700 hover:text-maroon-800 font-medium text-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Sign In</span>
                </button>
              ) : (
                <p className="text-ink-muted text-sm">
                  {mode === "login"
                    ? "Need an admin account?"
                    : "Already registered?"}
                  <button
                    type="button"
                    onClick={() =>
                      setMode(mode === "login" ? "signup" : "login")
                    }
                    className="text-maroon-700 hover:text-maroon-800 font-semibold ml-1.5 cursor-pointer"
                  >
                    {mode === "login" ? "Create account" : "Sign in"}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
