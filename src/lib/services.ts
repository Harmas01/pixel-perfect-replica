export type SalonService = {
  id: string | number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  createdAt?: string;
};

type SalonServiceRow = {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  created_at?: string;
};

export const SERVICES_STORAGE_KEY = "lucky-custom-services";
export const SERVICES_UPDATED_EVENT = "lucky-services-updated";
const DELETED_SERVICES_STORAGE_KEY = "lucky-deleted-services";
const SUPABASE_URL = "https://axtqkqicdcbmfobyvjhj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g_quHAMm9Utcz33BJEfmMg_YnQG1QJM";

export const DEFAULT_SALON_SERVICES: SalonService[] = [
  { id: "full", name: "Комплексный груминг", duration: 90, price: 3500, active: true },
  { id: "bath", name: "Купание и сушка", duration: 60, price: 1800, active: true },
  { id: "cut", name: "Стрижка и стайлинг", duration: 90, price: 2500, active: true },
  { id: "nail", name: "Стрижка когтей", duration: 20, price: 500, active: true },
  { id: "ear", name: "Чистка ушей", duration: 20, price: 400, active: true },
  { id: "coat", name: "Уход за лапами и шерстью", duration: 45, price: 900, active: true },
];

function serviceHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
  };
}

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

export async function fetchSalonServices(): Promise<SalonService[] | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/salon_services?select=id,name,duration,price,active,created_at&active=eq.true&order=sort_order.asc,created_at.asc`,
      { headers: serviceHeaders() },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as SalonServiceRow[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      duration: row.duration,
      price: row.price,
      active: row.active,
      createdAt: row.created_at,
    }));
  } catch {
    return null;
  }
}

async function requireSuccessful(response: Response, action: string) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(payload?.message || `Не удалось ${action}`);
}

export async function appendCustomService(service: SalonService, accessToken?: string) {
  if (accessToken) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/salon_services`, {
      method: "POST",
      headers: {
        ...serviceHeaders(accessToken),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: String(service.id),
        name: service.name,
        duration: service.duration,
        price: service.price,
        active: service.active,
        sort_order: 1000,
      }),
    });
    await requireSuccessful(response, "добавить услугу");
  }

  writeCustomServices([...readCustomServices(), service]);
}

export async function deleteSalonService(id: SalonService["id"], accessToken?: string) {
  if (accessToken) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/salon_services?id=eq.${encodeURIComponent(String(id))}`,
      {
        method: "DELETE",
        headers: {
          ...serviceHeaders(accessToken),
          Prefer: "return=minimal",
        },
      },
    );
    await requireSuccessful(response, "удалить услугу");
  }

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

export async function syncLocalServiceChanges(accessToken: string) {
  const deletedIds = readDeletedServiceIds();
  for (const id of deletedIds) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/salon_services?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          ...serviceHeaders(accessToken),
          Prefer: "return=minimal",
        },
      },
    );
    await requireSuccessful(response, "синхронизировать удалённые услуги");
  }

  const customServices = readCustomServices();
  if (!customServices.length) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/salon_services?on_conflict=id`, {
    method: "POST",
    headers: {
      ...serviceHeaders(accessToken),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(
      customServices.map((service) => ({
        id: String(service.id),
        name: service.name,
        duration: service.duration,
        price: service.price,
        active: service.active,
        sort_order: 1000,
      })),
    ),
  });
  await requireSuccessful(response, "синхронизировать добавленные услуги");
}
