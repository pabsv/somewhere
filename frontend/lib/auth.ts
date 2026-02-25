// ─── Auth helpers ─────────────────────────────────────────────────────────────
// Stores the current user in localStorage. No tokens — just the user_id
// returned by the backend on login. All API requests send this as X-User-ID.

const STORAGE_KEY = "flight_scraper_user";

export interface StoredUser {
  user_id: string;
  name: string;
  email: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}
