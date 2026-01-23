import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowLeft,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

const Login = () => {
  const [mode, setMode] = useState("login"); // login, signup, forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        return "Create Account";
      case "forgot":
        return "Reset Password";
      default:
        return "Welcome Back";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "signup":
        return "Register to manage tickets";
      case "forgot":
        return "Enter your email to receive a reset link";
      default:
        return "Sign in to access the dashboard";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-maroon-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>

        {/* Card */}
        <div className="card p-8 animate-slideUp">
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src="/icon-192.png"
              alt="SPC Logo"
              className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover"
            />
            <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
            <p className="text-gray-500 mt-2">{getSubtitle()}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="you@example.com"
                required
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password link - only show on login */}
            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" && <LogIn size={18} />}
                  {mode === "signup" && <UserPlus size={18} />}
                  {mode === "forgot" && <KeyRound size={18} />}
                  {mode === "login" && "Sign In"}
                  {mode === "signup" && "Create Account"}
                  {mode === "forgot" && "Send Reset Link"}
                </>
              )}
            </button>
          </form>

          {/* Toggle / Back links */}
          <div className="mt-6 text-center space-y-2">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-maroon-700 hover:text-maroon-800 font-medium text-sm inline-flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            ) : (
              <p className="text-gray-500 text-sm">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-maroon-700 hover:text-maroon-800 font-medium ml-1"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          SPC Academic Affairs Ticket System
        </p>
      </div>
    </div>
  );
};

export default Login;
