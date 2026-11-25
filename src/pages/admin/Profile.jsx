import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabaseClient";
import {
  validateAvatarFile,
  uploadAvatarFile,
  removeAvatarByUrl,
} from "../../lib/storageUtils";
import { User, Upload, Save, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

const formatRoleLabel = (role) => {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return role ? role.replace("_", " ") : "";
};

const Profile = () => {
  const { user, profile, updateProfile, updatePassword } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarPreview, setAvatarPreview] = useState(
    profile?.avatar_url || null,
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef(null);
  const blobUrlRef = useRef(null);

  const revokeBlobPreview = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeBlobPreview();
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    if (!avatarFile) {
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile, avatarFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = "";
      return;
    }

    revokeBlobPreview();
    const objectUrl = URL.createObjectURL(file);
    blobUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error("Please enter your full name");
      return;
    }

    setSaving(true);
    let newlyUploadedUrl = null;
    const previousAvatarUrl = profile?.avatar_url || null;

    try {
      let avatarUrl = profile?.avatar_url || null;

      if (avatarFile) {
        const uploaded = await uploadAvatarFile(
          supabase,
          avatarFile,
          `user-${user.id}`,
        );
        newlyUploadedUrl = uploaded.publicUrl;
        avatarUrl = uploaded.publicUrl;
      }

      await updateProfile({
        full_name: trimmedName,
        avatar_url: avatarUrl,
      });

      if (newlyUploadedUrl && previousAvatarUrl) {
        await removeAvatarByUrl(supabase, previousAvatarUrl);
      }

      revokeBlobPreview();
      setAvatarFile(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      if (newlyUploadedUrl) {
        await removeAvatarByUrl(supabase, newlyUploadedUrl);
      }
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const passwordMismatch =
    Boolean(passwordData.confirmPassword) &&
    passwordData.newPassword !== passwordData.confirmPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      await updatePassword(passwordData.newPassword);
      toast.success("Password changed successfully");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Profile Settings
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Manage your staff display identity, avatar, and account security.
        </p>
      </div>

      {/* Identity & Avatar Section */}
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">
            Profile Information
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 bg-rail border border-border rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:border-border-strong transition-colors shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={30} className="text-ink-subtle" />
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                <Upload size={16} />
                <span>Upload Photo</span>
              </button>
              <p className="text-xs text-ink-muted mt-1.5">
                Max 2MB · JPG, PNG, or WebP
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="label">
                Full Name *
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

            <div>
              <label htmlFor="profileEmail" className="label">
                Email Address
              </label>
              <input
                id="profileEmail"
                type="email"
                value={user?.email || ""}
                className="input"
                disabled
              />
              <p className="text-xs text-ink-muted mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label htmlFor="profileRole" className="label">
                Assigned Role
              </label>
              <input
                id="profileRole"
                type="text"
                value={formatRoleLabel(profile?.role)}
                className="input"
                disabled
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={16} />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Password Section */}
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">
            Security &amp; Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="newPassword" className="label">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="input pr-12"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                  className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`input pr-12 ${passwordMismatch ? "input-error" : ""}`}
                  placeholder="Re-enter new password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {passwordMismatch && (
                <p className="text-xs text-[#b91c1c] mt-1.5">
                  Passwords do not match.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={changingPassword || passwordMismatch}
              className="btn-primary"
            >
              <Lock size={16} />
              <span>
                {changingPassword ? "Changing…" : "Change Password"}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Profile;
