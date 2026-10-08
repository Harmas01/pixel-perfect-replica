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

export const ORDERS_STORAGE_KEY = "lucky-admin-appointments";
export const ORDERS_UPDATED_EVENT = "lucky-orders-updated";

const LEGACY_DEMO_ORDERS = new Set([
  "1|+7 921 455-18-24|Кокос",
  "2|+7 911 230-47-10|Боня",
  "3|+7 921 104-35-66|Ричи",
  "4|+7 950 221-86-03|Луна",
  "5|+7 981 403-90-12|Грей",
]);

function isLegacyDemoOrder(order: Order) {
  return LEGACY_DEMO_ORDERS.has(`${order.id}|${order.phone}|${order.pet}`);
}

export function readOrders(fallback: Order[] = []): Order[] {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(ORDERS_STORAGE_KEY);
  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? (parsed as Order[]).filter((order) => !isLegacyDemoOrder(order))
      : fallback;
  } catch {
    return fallback;
  }
}

export function writeOrders(orders: Order[]) {
  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT));
}

export function appendOrder(order: Order) {
  const orders = readOrders();
  writeOrders(
    [...orders, order].sort((a, b) => {
      const dateResult = (a.date || "").localeCompare(b.date || "");
      return dateResult || a.time.localeCompare(b.time);
    }),
  );
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
