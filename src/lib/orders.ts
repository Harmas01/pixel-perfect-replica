export type OrderStatus = "new" | "confirmed" | "progress" | "done";

export type Order = {
  id: number;
  time: string;
  owner: string;
  pet: string;
  breed: string;
  service: string;
  price: number;
  status: OrderStatus;
  phone: string;
  date?: string;
  note?: string;
  source?: "website" | "admin";
  createdAt?: string;
};

type AppointmentRow = {
  id: number;
  owner: string;
  phone: string;
  pet: string;
  breed: string;
  service: string;
  appointment_date: string;
  appointment_time: string;
  note: string;
  price: number;
  status: OrderStatus;
  source: "website" | "admin";
  created_at: string;
};

export const ORDERS_STORAGE_KEY = "lucky-admin-appointments";
export const ORDERS_UPDATED_EVENT = "lucky-orders-updated";
const SUPABASE_URL = "https://axtqkqicdcbmfobyvjhj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g_quHAMm9Utcz33BJEfmMg_YnQG1QJM";

const LEGACY_DEMO_ORDERS = new Set([
  "1|+7 921 455-18-24|Кокос",
  "2|+7 911 230-47-10|Боня",
  "3|+7 921 104-35-66|Ричи",
  "4|+7 950 221-86-03|Луна",
  "5|+7 981 403-90-12|Грей",
]);

function apiHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
  };
}

function isLegacyDemoOrder(order: Order) {
  return LEGACY_DEMO_ORDERS.has(`${order.id}|${order.phone}|${order.pet}`);
}

function sortOrders(orders: Order[]) {
  return [...orders].sort((a, b) => {
    const dateResult = (a.date || "").localeCompare(b.date || "");
    return dateResult || a.time.localeCompare(b.time);
  });
}

function toRow(order: Order) {
  return {
    id: order.id,
    owner: order.owner,
    phone: order.phone,
    pet: order.pet,
    breed: order.breed,
    service: order.service,
    appointment_date: order.date,
    appointment_time: order.time,
    note: order.note || "",
    price: order.price,
    status: order.status,
    source: order.source || "website",
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: AppointmentRow): Order {
  return {
    id: Number(row.id),
    owner: row.owner,
    phone: row.phone,
    pet: row.pet,
    breed: row.breed,
    service: row.service,
    date: row.appointment_date,
    time: row.appointment_time,
    note: row.note,
    price: row.price,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  };
}

async function requireSuccessful(response: Response, fallbackMessage: string) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; error?: string; code?: string }
    | null;
  if (payload?.code === "23505") {
    throw new Error("Это время уже занято. Выберите другую дату или время.");
  }
  throw new Error(payload?.message || payload?.error || fallbackMessage);
}

export function readOrders(fallback: Order[] = []): Order[] {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(ORDERS_STORAGE_KEY);
  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? sortOrders((parsed as Order[]).filter((order) => !isLegacyDemoOrder(order)))
      : fallback;
  } catch {
    return fallback;
  }
}

export function writeOrders(orders: Order[]) {
  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(sortOrders(orders)));
  window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT));
}

export async function fetchOrders(accessToken: string): Promise<Order[] | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?select=id,owner,phone,pet,breed,service,appointment_date,appointment_time,note,price,status,source,created_at&order=appointment_date.asc,appointment_time.asc`,
      { headers: apiHeaders(accessToken) },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as AppointmentRow[];
    return rows.map(fromRow);
  } catch {
    return null;
  }
}

export async function appendOrder(order: Order, accessToken?: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
    method: "POST",
    headers: {
      ...apiHeaders(accessToken),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(toRow(order)),
  });
  await requireSuccessful(response, "Не удалось сохранить заявку");

  const localOrders = readOrders();
  writeOrders(sortOrders([...localOrders.filter((item) => item.id !== order.id), order]));
}

export async function isTimeSlotTakenRemote(date: string, time: string) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/is_appointment_slot_taken`,
      {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ p_date: date, p_time: time }),
      },
    );
    if (!response.ok) return false;
    return Boolean(await response.json());
  } catch {
    return false;
  }
}

export async function updateOrderStatusRemote(
  id: number,
  status: OrderStatus,
  accessToken: string,
) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?id=eq.${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      headers: {
        ...apiHeaders(accessToken),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    },
  );
  await requireSuccessful(response, "Не удалось обновить статус записи");
}

export async function deleteOrderRemote(id: number, accessToken: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?id=eq.${encodeURIComponent(String(id))}`,
    {
      method: "DELETE",
      headers: {
        ...apiHeaders(accessToken),
        Prefer: "return=minimal",
      },
    },
  );
  await requireSuccessful(response, "Не удалось удалить запись");
}

export async function syncLocalOrdersToRemote(accessToken: string) {
  const localOrders = readOrders();
  for (const order of localOrders) {
    if (!order.date) continue;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?on_conflict=id`,
      {
        method: "POST",
        headers: {
          ...apiHeaders(accessToken),
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(toRow(order)),
      },
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { code?: string } | null;
      if (payload?.code !== "23505") {
        await requireSuccessful(response, "Не удалось перенести локальные записи");
      }
    }
  }
}

export function isTimeSlotTaken(orders: Order[], date: string, time: string, excludeId?: number) {
  return orders.some(
    (order) =>
      order.id !== excludeId &&
      order.date === date &&
      order.time === time &&
      order.status !== "done",
  );
}
