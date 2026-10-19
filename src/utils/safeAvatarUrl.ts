/**
 * Restrict profile-photo URLs to passive image data or safe web URLs.
 * User profile settings can be edited locally, so treat persisted values as untrusted.
 */
const BASE64_IMAGE_DATA_URL =
  /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i;

export function getSafeAvatarSrc(value: unknown, baseOrigin = 'https://bluenote.invalid'): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;
  if (BASE64_IMAGE_DATA_URL.test(candidate)) return candidate;

  try {
    const base = new URL(baseOrigin);
    const parsed = new URL(candidate, base);
    if (parsed.protocol === 'https:' && parsed.hostname) return parsed.href;
    if (
      parsed.origin === base.origin &&
      parsed.protocol === base.protocol &&
      (base.protocol === 'https:' || base.protocol === 'http:')
    ) {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}
