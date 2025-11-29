import { API_URL } from "@env";

/**
 * Converts a relative avatar URL to a full URL
 * @param avatarUrl - The avatar URL from the backend (e.g., "/uploads/avatars/user_123.jpg")
 * @returns Full URL (e.g., "http://192.168.2.5:8000/uploads/avatars/user_123.jpg")
 */
export const getFullAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) {
    return null;
  }

  // If it's already a full URL (starts with http:// or https://), return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // If it's a relative URL, prepend the API_URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${API_URL}${cleanPath}`;
};
