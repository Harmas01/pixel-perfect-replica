export type BookingSettings = {
  advanceDays: number;
};

export const DEFAULT_BOOKING_ADVANCE_DAYS = 14;
export const BOOKING_SETTINGS_STORAGE_KEY = "lucky-booking-settings";
export const BOOKING_SETTINGS_UPDATED_EVENT = "lucky-booking-settings-updated";

export function normalizeAdvanceDays(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_BOOKING_ADVANCE_DAYS;
  return Math.min(365, Math.max(1, Math.round(parsed)));
}

export function readBookingSettings(): BookingSettings {
  if (typeof window === "undefined") {
    return { advanceDays: DEFAULT_BOOKING_ADVANCE_DAYS };
  }

  const stored = window.localStorage.getItem(BOOKING_SETTINGS_STORAGE_KEY);
  if (!stored) return { advanceDays: DEFAULT_BOOKING_ADVANCE_DAYS };

  try {
    const parsed = JSON.parse(stored) as Partial<BookingSettings>;
    return { advanceDays: normalizeAdvanceDays(parsed.advanceDays) };
  } catch {
    return { advanceDays: DEFAULT_BOOKING_ADVANCE_DAYS };
  }
}

export function writeBookingSettings(settings: BookingSettings) {
  const normalized = { advanceDays: normalizeAdvanceDays(settings.advanceDays) };
  window.localStorage.setItem(BOOKING_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(BOOKING_SETTINGS_UPDATED_EVENT));
}

export function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBookingDateBounds(advanceDays: number, now = new Date()) {
  const minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + normalizeAdvanceDays(advanceDays));

  return {
    min: formatLocalDateInput(minDate),
    max: formatLocalDateInput(maxDate),
  };
}
