export type SalonService = {
  id: number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  createdAt?: string;
};

export const SERVICES_STORAGE_KEY = "lucky-custom-services";
export const SERVICES_UPDATED_EVENT = "lucky-services-updated";

export function readCustomServices(): SalonService[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(SERVICES_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as SalonService[]) : [];
  } catch {
    return [];
  }
}

export function writeCustomServices(services: SalonService[]) {
  window.localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
  window.dispatchEvent(new CustomEvent(SERVICES_UPDATED_EVENT));
}

export function appendCustomService(service: SalonService) {
  writeCustomServices([...readCustomServices(), service]);
}
