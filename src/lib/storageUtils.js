export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Validate an image file before uploading to Supabase Storage.
 */
export const validateAvatarFile = (file) => {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Please select a JPG, PNG, or WebP image file",
    };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { valid: false, error: "Image must be less than 2MB" };
  }

  return { valid: true, error: null };
};

/**
 * Extract the storage object key from a public avatars bucket URL.
 */
export const extractAvatarFileName = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const marker = "/avatars/";
    const idx = urlObj.pathname.lastIndexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(urlObj.pathname.slice(idx + marker.length));
    }
    const parts = urlObj.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]) : null;
  } catch {
    return null;
  }
};

/**
 * Upload an avatar file to the avatars bucket and return its public URL and object name.
 */
export const uploadAvatarFile = async (supabase, file, prefix = "avatar") => {
  const nameExt = file.name?.split(".").pop()?.toLowerCase();
  const fileExt = EXT_BY_MIME[file.type] || nameExt || "jpg";
  const uniqueSuffix = Math.random().toString(36).slice(2, 7);
  const fileName = `${prefix}-${Date.now()}-${uniqueSuffix}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
  return {
    publicUrl: data.publicUrl,
    fileName,
  };
};

/**
 * Best-effort deletion of an existing avatar object by its public URL.
 */
export const removeAvatarByUrl = async (supabase, url) => {
  const fileName = extractAvatarFileName(url);
  if (!fileName) return;

  try {
    const { error } = await supabase.storage.from("avatars").remove([fileName]);
    if (error) {
      console.warn("Failed to remove old avatar:", error);
    }
  } catch (err) {
    console.warn("Failed to remove old avatar:", err);
  }
};
