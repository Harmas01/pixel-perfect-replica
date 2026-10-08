export type SalonService = {
  id: string | number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  createdAt?: string;
};

export const SERVICES_STORAGE_KEY = "lucky-custom-services";
export const SERVICES_UPDATED_EVENT = "lucky-services-updated";
const DELETED_SERVICES_STORAGE_KEY = "lucky-deleted-services";

export const DEFAULT_SALON_SERVICES: SalonService[] = [
  { id: "full", name: "Комплексный груминг", duration: 90, price: 3500, active: true },
  { id: "bath", name: "Купание и сушка", duration: 60, price: 1800, active: true },
  { id: "cut", name: "Стрижка и стайлинг", duration: 90, price: 2500, active: true },
  { id: "nail", name: "Стрижка когтей", duration: 20, price: 500, active: true },
  { id: "ear", name: "Чистка ушей", duration: 20, price: 400, active: true },
  { id: "coat", name: "Уход за лапами и шерстью", duration: 45, price: 900, active: true },
];

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

function readDeletedServiceIds(): string[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(DELETED_SERVICES_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function readSalonServices(): SalonService[] {
  const deletedIds = new Set(readDeletedServiceIds());
  return [...DEFAULT_SALON_SERVICES, ...readCustomServices()].filter(
    (service) => service.active && !deletedIds.has(String(service.id)),
  );
}

export function deleteSalonService(id: SalonService["id"]) {
  const customServices = readCustomServices();
  if (customServices.some((service) => String(service.id) === String(id))) {
    writeCustomServices(customServices.filter((service) => String(service.id) !== String(id)));
    return;
  }

  const deletedIds = new Set(readDeletedServiceIds());
  deletedIds.add(String(id));
  window.localStorage.setItem(DELETED_SERVICES_STORAGE_KEY, JSON.stringify([...deletedIds]));
  window.dispatchEvent(new CustomEvent(SERVICES_UPDATED_EVENT));
}
