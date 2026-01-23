import { useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { User, Upload, Save, Lock } from "lucide-react";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, profile, updateProfile } = useAuth();
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `user-${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Extract filename from avatar URL
  const extractFileName = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      return pathParts[pathParts.length - 1];
    } catch {
      return null;
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        // Delete old avatar if exists
        if (profile?.avatar_url) {
          const oldFileName = extractFileName(profile.avatar_url);
          if (oldFileName) {
            await supabase.storage.from("avatars").remove([oldFileName]);
          }
        }
        avatarUrl = await uploadAvatar(avatarFile);
      }

      await updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
      });

      toast.success("Profile updated successfully");
      setAvatarFile(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
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
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

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
              <p className="text-sm text-gray-400 mt-2">Max 2MB, JPG or PNG</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
            <label className="label">Email Address</label>
            <input
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
            <label className="label">Role</label>
            <input
              type="text"
              value={profile?.role?.replace("_", " ").toUpperCase() || ""}
              className="input bg-gray-50 capitalize"
              disabled
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              "Saving..."
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
              "Changing..."
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
