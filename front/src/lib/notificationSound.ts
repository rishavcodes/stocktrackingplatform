const NOTIFICATION_SOUND_PATH = "/sounds/mixkit-flute-mobile-phone-notification-alert-2316.wav";

export const NOTIFICATION_SOUND_STORAGE_KEY = "marketplaceRecommendationSoundMuted";

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_SOUND_STORAGE_KEY, muted ? "true" : "false");
  } catch {
    // ignore
  }
}

/**
 * Plays the notification sound from the audio file.
 * Place your audio file at: public/sounds/
 * Respects user preference (muted via navbar toggle).
 */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  if (isNotificationSoundMuted()) return;
  try {
    
    const audio = new Audio(NOTIFICATION_SOUND_PATH);
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Autoplay may be blocked by browser; fail silently
    });
  } catch {
    // Silently fail if Audio is not supported
  }
}
