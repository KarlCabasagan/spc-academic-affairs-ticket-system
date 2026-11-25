import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabaseClient";
import {
  validateAvatarFile,
  uploadAvatarFile,
  removeAvatarByUrl,
} from "../../lib/storageUtils";
import { User, Upload, Save, Lock } from "lucide-react";
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

  // Sync local form fields when profile hydrates or updates externally
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
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
      {/* Profile Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Profile Information
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div
              className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={36} className="text-gray-400" />
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                <Upload size={18} />
                <span>Upload Photo</span>
              </button>
              <p className="text-sm text-gray-400 mt-2">
                Max 2MB, JPG, PNG, or WebP
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

          {/* Full Name */}
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

          {/* Email (Read Only) */}
          <div>
            <label htmlFor="profileEmail" className="label">
              Email Address
            </label>
            <input
              id="profileEmail"
              type="email"
              value={user?.email || ""}
              className="input bg-gray-50"
              disabled
            />
            <p className="text-sm text-gray-400 mt-1">
              Email cannot be changed
            </p>
          </div>

          {/* Role (Read Only) */}
          <div>
            <label htmlFor="profileRole" className="label">
              Role
            </label>
            <input
              id="profileRole"
              type="text"
              value={formatRoleLabel(profile?.role)}
              className="input bg-gray-50"
              disabled
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="label">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              className="input"
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              className="input"
              placeholder="Re-enter new password"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="btn-primary"
          >
            {changingPassword ? (
              "Changing…"
            ) : (
              <>
                <Lock size={18} />
                <span>Change Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
