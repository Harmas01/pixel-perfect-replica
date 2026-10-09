import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  LogOut,
  Menu,
  MoreHorizontal,
  PawPrint,
  PhoneCall,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import heroDog from "@/assets/hero-dog.jpg";
import aboutImg from "@/assets/about-dog.png";
import { Toaster } from "@/components/ui/sonner";
import {
  ORDERS_STORAGE_KEY,
  ORDERS_UPDATED_EVENT,
  isTimeSlotTaken,
  readOrders,
  writeOrders,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import {
  appendCustomService,
  DEFAULT_SALON_SERVICES,
  deleteSalonService,
  fetchSalonServices,
  readSalonServices,
  SERVICES_UPDATED_EVENT,
  syncLocalServiceChanges,
  type SalonService,
} from "@/lib/services";
import {
  BOOKING_SETTINGS_UPDATED_EVENT,
  DEFAULT_BOOKING_ADVANCE_DAYS,
  getBookingDateBounds,
  readBookingSettings,
  writeBookingSettings,
} from "@/lib/settings";
import {
  getAuthorizedSession,
  signInAdmin,
  signOutAdmin,
  type AdminAuthSession,
} from "@/lib/admin-auth";
import {
  fetchGalleryImageUrls,
  GALLERY_IMAGES_UPDATED_EVENT,
  uploadGalleryImage,
  type GalleryImageSlot,
} from "@/lib/site-content";

const WINDOWS_APP_DOWNLOAD_URL =
  "https://github.com/Harmas01/pixel-perfect-replica/releases/download/windows-app-latest/LuckyAdmin.exe";
const YANDEX_REVIEWS_WIDGET_URL =
  "https://yandex.ru/maps-reviews-widget/184039255742?comments";
const YANDEX_REVIEWS_URL =
  "https://yandex.ru/maps/26081/kolpino/?ll=30.608168%2C59.741450&mode=poi&poi%5Bpoint%5D=30.608355%2C59.741533&poi%5Buri%5D=ymapsbm1%3A%2F%2Forg%3Foid%3D184039255742&pt=30.608306%2C59.741463%2Cpm2rdl&tab=reviews&z=20.8";
const GALLERY_FALLBACKS = [heroDog, aboutImg, logo] as const;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админ-панель — Лакки" },
      { name: "description", content: "Управление записями и клиентами салона груминга «Лакки»." },
    ],
  }),
  component: AdminAccessGate,
});

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  new: {
    label: "Нужно позвонить",
    className: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  },
  confirmed: { label: "Подтверждена", className: "border-sky-400/20 bg-sky-400/10 text-sky-200" },
  progress: {
    label: "В работе",
    className: "border-violet-400/20 bg-violet-400/10 text-violet-200",
  },
  done: { label: "Готово", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
  new: "confirmed",
  confirmed: "progress",
  progress: "done",
  done: "done",
};

const NAV = [
  { label: "Обзор", href: "#overview", icon: LayoutDashboard },
  { label: "Записи", href: "#appointments", icon: CalendarDays },
  { label: "Отзывы", href: "#reviews-admin", icon: Star },
  { label: "Настройки", href: "#settings", icon: Settings },
] as const;

function formatRemainingMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours} ч ${minutes} мин`;
  if (hours) return `${hours} ч`;
  return `${minutes} мин`;
}

export function getWorkdayStatus(now = new Date()) {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const opening = 10 * 60;
  const closing = 20 * 60;

  if (minutesNow >= opening && minutesNow < closing) {
    return {
      isOpen: true,
      text: `До конца рабочего дня: ${formatRemainingMinutes(closing - minutesNow)}`,
    };
  }

  const untilOpening = minutesNow < opening ? opening - minutesNow : 24 * 60 - minutesNow + opening;

  return {
    isOpen: false,
    text: `Салон закрыт · до открытия ${formatRemainingMinutes(untilOpening)}`,
  };
}

function orderMeta(order: Order) {
  const date = order.date ? order.date.split("-").reverse().join(".") : "Дата не указана";
  if (order.source === "website") {
    return `${date} · заявка с сайта`;
  }
  return `${date} · ${order.price.toLocaleString("ru-RU")} ₽`;
}

function Panel({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-[1.6rem] border border-white/10 bg-white/[0.035] ${className}`}
    >
      {children}
    </section>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#090909] px-4 text-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-white/55" />
        <p className="mt-4 text-xs uppercase tracking-[.2em] text-white/35">
          Проверяем доступ
        </p>
      </div>
    </div>
  );
}

function AdminLogin({
  onAuthenticated,
  initialError = "",
}: {
  onAuthenticated: (session: AdminAuthSession) => void;
  initialError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const session = await signInAdmin(email, password);
      onAuthenticated(session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Не удалось выполнить вход");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080808] px-4 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/[.055] blur-3xl" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/12 bg-[#101010]/95 p-6 shadow-2xl shadow-black sm:p-8">
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="Лакки"
            className="h-14 w-14 rounded-full border border-white/15 object-cover"
          />
          <div>
            <p className="font-display text-2xl font-semibold">Лакки</p>
            <p className="text-[10px] uppercase tracking-[.22em] text-white/40">
              Приложение администратора
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[.07] text-white/70">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold">Вход в панель</h1>
          <p className="mt-2 text-sm leading-6 text-white/40">
            Введите почту администратора и пароль. Учётная запись создаётся только вручную
            владельцем проекта в Supabase.
          </p>
        </div>

        <form onSubmit={submitAuth} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-white/40">
              Электронная почта
            </span>
            <span className="relative block">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.04] pl-11 pr-4 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-white/40">
              Пароль
            </span>
            <span className="relative block">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.04] pl-11 pr-12 text-sm outline-none transition placeholder:text-white/25 focus:border-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-white/35 transition hover:bg-white/10 hover:text-white"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/[.08] px-4 py-3 text-xs leading-5 text-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:shadow-[0_0_28px_rgba(255,255,255,.15)] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Войти
          </button>
        </form>

        <p className="mt-6 border-t border-white/10 pt-5 text-center text-[10px] leading-5 text-white/25">
          Регистрация через приложение отключена. Доступ разрешён только заранее созданной
          учётной записи.
        </p>
      </div>
    </div>
  );
}

function AdminAccessGate() {
  const [session, setSession] = useState<AdminAuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [initialError, setInitialError] = useState("");

  useEffect(() => {
    let active = true;
    getAuthorizedSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch((authError) => {
        if (active) {
          setInitialError(
            authError instanceof Error
              ? authError.message
              : "Не удалось проверить доступ. Попробуйте ещё раз.",
          );
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (checking) return <AuthLoadingScreen />;
  if (!session) {
    return <AdminLogin onAuthenticated={setSession} initialError={initialError} />;
  }

  return (
    <AdminPage
      authSession={session}
      onSignedOut={async () => {
        await signOutAdmin();
        setSession(null);
      }}
    />
  );
}

function AdminPage({
  authSession,
  onSignedOut,
}: {
  authSession: AdminAuthSession;
  onSignedOut: () => Promise<void>;
}) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [appointments, setAppointments] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [salonServices, setSalonServices] = useState<SalonService[]>(DEFAULT_SALON_SERVICES);
  const [workdayStatus, setWorkdayStatus] = useState({
    isOpen: true,
    text: "Обновляем статус…",
  });
  const [currentDateLabel, setCurrentDateLabel] = useState("Сегодня");
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [callChecked, setCallChecked] = useState(false);
  const [ordersReady, setOrdersReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<Array<string | null>>([null, null, null]);
  const [galleryUploading, setGalleryUploading] = useState<GalleryImageSlot | null>(null);
  const [advanceDaysDraft, setAdvanceDaysDraft] = useState(String(DEFAULT_BOOKING_ADVANCE_DAYS));
  const [bookingDateBounds, setBookingDateBounds] = useState<{
    min: string;
    max: string;
  } | null>(null);

  useEffect(() => {
    const refreshOrders = () => setAppointments(readOrders());
    refreshOrders();
    setOrdersReady(true);
    window.addEventListener("storage", refreshOrders);
    window.addEventListener(ORDERS_UPDATED_EVENT, refreshOrders);
    return () => {
      window.removeEventListener("storage", refreshOrders);
      window.removeEventListener(ORDERS_UPDATED_EVENT, refreshOrders);
    };
  }, []);

  const orderStats = useMemo(() => {
    return [
      {
        label: "Всего заявок",
        value: appointments.length,
        note: "Сохранено на этом устройстве",
        icon: CalendarDays,
      },
      {
        label: "Нужно позвонить",
        value: appointments.filter((order) => order.status === "new").length,
        note: "Ожидают подтверждения",
        icon: PhoneCall,
      },
    ];
  }, [appointments]);

  const statusCounts = useMemo(
    () => ({
      new: appointments.filter((order) => order.status === "new").length,
      confirmed: appointments.filter((order) => order.status === "confirmed").length,
      progress: appointments.filter((order) => order.status === "progress").length,
      done: appointments.filter((order) => order.status === "done").length,
    }),
    [appointments],
  );

  useEffect(() => {
    let active = true;

    const refreshServices = async () => {
      const remoteServices = await fetchSalonServices();
      if (active) setSalonServices(remoteServices ?? readSalonServices());
    };
    const handleServicesChange = () => void refreshServices();
    const syncAndRefresh = async () => {
      try {
        await syncLocalServiceChanges(authSession.access_token);
      } catch {
        toast.error("Не удалось синхронизировать услуги с сайтом");
      }
      await refreshServices();
    };

    setSalonServices(readSalonServices());
    void syncAndRefresh();
    window.addEventListener("storage", handleServicesChange);
    window.addEventListener(SERVICES_UPDATED_EVENT, handleServicesChange);
    return () => {
      active = false;
      window.removeEventListener("storage", handleServicesChange);
      window.removeEventListener(SERVICES_UPDATED_EVENT, handleServicesChange);
    };
  }, [authSession.access_token]);

  useEffect(() => {
    let active = true;
    const refreshGalleryImages = () => {
      void fetchGalleryImageUrls().then((images) => {
        if (active) setGalleryImages(images);
      });
    };

    refreshGalleryImages();
    window.addEventListener("storage", refreshGalleryImages);
    window.addEventListener(GALLERY_IMAGES_UPDATED_EVENT, refreshGalleryImages);
    return () => {
      active = false;
      window.removeEventListener("storage", refreshGalleryImages);
      window.removeEventListener(GALLERY_IMAGES_UPDATED_EVENT, refreshGalleryImages);
    };
  }, []);

  useEffect(() => {
    const refreshBookingSettings = () => {
      const settings = readBookingSettings();
      setAdvanceDaysDraft(String(settings.advanceDays));
      setBookingDateBounds(getBookingDateBounds(settings.advanceDays));
    };
    refreshBookingSettings();
    window.addEventListener("storage", refreshBookingSettings);
    window.addEventListener(BOOKING_SETTINGS_UPDATED_EVENT, refreshBookingSettings);
    return () => {
      window.removeEventListener("storage", refreshBookingSettings);
      window.removeEventListener(BOOKING_SETTINGS_UPDATED_EVENT, refreshBookingSettings);
    };
  }, []);

  useEffect(() => {
    const updateWorkdayStatus = () => setWorkdayStatus(getWorkdayStatus());
    setCurrentDateLabel(
      new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        weekday: "long",
      }).format(new Date()),
    );
    updateWorkdayStatus();
    const timer = window.setInterval(updateWorkdayStatus, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ordersReady) return;
    const serialized = JSON.stringify(appointments);
    if (window.localStorage.getItem(ORDERS_STORAGE_KEY) !== serialized) {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, serialized);
    }
  }, [appointments, ordersReady]);

  useEffect(() => {
    const syncSettingsView = () => setSettingsOpen(window.location.hash === "#settings");
    syncSettingsView();
    window.addEventListener("hashchange", syncSettingsView);
    return () => window.removeEventListener("hashchange", syncSettingsView);
  }, []);

  const showCallReminders = () => {
    const pendingCalls = appointments.filter((order) => order.status === "new").length;
    setQuery("");
    setFilter("new");
    document.getElementById("appointments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (pendingCalls) {
      toast.success(`Нужно позвонить: ${pendingCalls}`);
    } else {
      toast.success("Нет заявок, ожидающих звонка");
    }
  };

  const visibleAppointments = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return appointments.filter((item) => {
      const matchesFilter = filter === "all" || item.status === filter;
      const matchesQuery =
        !normalized ||
        [item.owner, item.pet, item.breed, item.service, item.phone]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [appointments, filter, query]);

  const changeStatus = (order: Order) => {
    if (order.status === "new") {
      setCallChecked(false);
      setConfirmingOrder(order);
      return;
    }
    if (order.status === "done") {
      toast("Запись уже завершена");
      return;
    }
    setAppointments((items) =>
      items.map((item) =>
        item.id === order.id ? { ...item, status: NEXT_STATUS[item.status] } : item,
      ),
    );
    toast.success("Статус записи обновлён");
  };

  const confirmAfterCall = () => {
    if (!confirmingOrder || !callChecked) return;
    setAppointments((items) =>
      items.map((item) =>
        item.id === confirmingOrder.id ? { ...item, status: "confirmed" } : item,
      ),
    );
    toast.success(`${confirmingOrder.pet}: запись подтверждена после звонка`);
    setConfirmingOrder(null);
    setCallChecked(false);
  };

  const deleteAppointment = () => {
    if (!deletingOrder) return;
    const nextAppointments = appointments.filter((item) => item.id !== deletingOrder.id);
    setAppointments(nextAppointments);
    writeOrders(nextAppointments);
    if (confirmingOrder?.id === deletingOrder.id) {
      setConfirmingOrder(null);
      setCallChecked(false);
    }
    toast.success(`Запись для ${deletingOrder.pet} удалена`);
    setDeletingOrder(null);
  };

  const saveBookingWindow = () => {
    const advanceDays = Number(advanceDaysDraft);
    if (!Number.isInteger(advanceDays) || advanceDays < 1 || advanceDays > 365) {
      toast.error("Укажите целое число от 1 до 365 дней");
      return;
    }
    writeBookingSettings({ advanceDays });
    setBookingDateBounds(getBookingDateBounds(advanceDays));
    toast.success(`Запись открыта на ${advanceDays} дней вперёд`);
  };

  const addAppointment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pet = String(data.get("pet") || "Новый питомец");
    const date = String(data.get("date") || "");
    const time = String(data.get("time") || "18:00");
    if (!bookingDateBounds || date < bookingDateBounds.min || date > bookingDateBounds.max) {
      toast.error(
        bookingDateBounds
          ? `Выберите дату с ${bookingDateBounds.min.split("-").reverse().join(".")} по ${bookingDateBounds.max.split("-").reverse().join(".")}`
          : "Подождите, пока загрузятся доступные даты",
      );
      return;
    }
    if (time < "10:00" || time > "20:00") {
      toast.error("Выберите время в пределах рабочего дня: с 10:00 до 20:00.");
      return;
    }
    if (isTimeSlotTaken(appointments, date, time)) {
      toast.error("Это время уже занято. Выберите другую дату или время.");
      return;
    }
    setAppointments((items) =>
      [
        ...items,
        {
          id: Date.now(),
          time,
          owner: String(data.get("owner") || "Новый клиент"),
          pet,
          breed: String(data.get("breed") || "Порода не указана"),
          service: String(data.get("service") || "Комплексный груминг"),
          price: Number(data.get("price")) || 3500,
          status: "new",
          phone: String(data.get("phone") || "Телефон не указан"),
          date,
          source: "admin",
          createdAt: new Date().toISOString(),
        },
      ].sort((a, b) => {
        const dateResult = (a.date || "").localeCompare(b.date || "");
        return dateResult || a.time.localeCompare(b.time);
      }),
    );
    setShowNew(false);
    event.currentTarget.reset();
    toast.success(`${pet}: запись добавлена`);
  };

  const changeGalleryImage = async (
    slot: GalleryImageSlot,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setGalleryUploading(slot);
    try {
      const url = await uploadGalleryImage(file, slot, authSession.access_token);
      setGalleryImages((images) =>
        images.map((image, index) => (index === slot - 1 ? url : image)),
      );
      toast.success(`Фотография №${slot} обновлена в галерее`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить фотографию");
    } finally {
      input.value = "";
      setGalleryUploading(null);
    }
  };

  const addService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) return;

    try {
      await appendCustomService(
        {
          id: Date.now(),
          name,
          duration: Number(data.get("duration")) || 60,
          price: Number(data.get("price")) || 0,
          active: true,
          createdAt: new Date().toISOString(),
        },
        authSession.access_token,
      );
      const remoteServices = await fetchSalonServices();
      setSalonServices(remoteServices ?? readSalonServices());
      setShowServiceForm(false);
      form.reset();
      toast.success(`Услуга «${name}» добавлена на сайт`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось добавить услугу");
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white selection:bg-white selection:text-black">
      <Toaster position="top-right" />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col border-r border-white/10 bg-[#0c0c0c] p-5 transition-transform duration-300 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Вернуться на сайт">
            <img
              src={logo}
              alt="Лакки"
              className="h-12 w-12 rounded-full border border-white/15 object-cover"
            />
            <div>
              <p className="font-display text-xl font-semibold">Лакки</p>
              <p className="text-[10px] uppercase tracking-[.22em] text-white/45">
                Управление салоном
              </p>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenu(false)}
            className="rounded-xl p-2 text-white/55 hover:bg-white/10 lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-10 space-y-1" aria-label="Навигация админ-панели">
          {NAV.map(({ label, href, icon: Icon }, index) => (
            <a
              key={label}
              href={href}
              onClick={(event) => {
                setMobileMenu(false);
                if (href === "#settings") {
                  event.preventDefault();
                  window.location.hash = "settings";
                  setSettingsOpen(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                setSettingsOpen(false);
                window.setTimeout(
                  () => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }),
                  0,
                );
              }}
              className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition ${
                (href === "#settings" && settingsOpen) || (index === 0 && !settingsOpen)
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/[.07] hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-[1.4rem] border border-white/10 bg-white/[.04] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-semibold text-black">
              А
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Администратор</p>
              <p className="truncate text-xs text-white/45">{authSession.user.email}</p>
            </div>
            <MoreHorizontal className="h-4 w-4 text-white/40" />
          </div>
          <button
            type="button"
            onClick={onSignedOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Выйти из аккаунта
          </button>
          <Link
            to="/"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] text-white/35 transition hover:text-white/65"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Открыть основной сайт
          </Link>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenu(false)}
          aria-label="Закрыть меню"
        />
      )}

      <main className="min-h-screen lg:ml-[284px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-white/10 bg-[#090909]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <button
            onClick={() => setMobileMenu(true)}
            className="rounded-xl border border-white/10 p-2.5 lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              id="client-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти клиента, питомца или услугу"
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.045] pl-10 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-white/30"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="text-xs font-medium capitalize">{currentDateLabel}</p>
              <p className="text-[11px] text-white/40">Колпино</p>
            </div>
            <button
              onClick={showCallReminders}
              className="relative ml-3 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60 transition hover:text-white"
              aria-label="Уведомления"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <a
              href={WINDOWS_APP_DOWNLOAD_URL}
              download="LuckyAdmin.exe"
              className="hidden h-11 items-center gap-2 rounded-2xl border border-white/10 px-3.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white md:flex"
              title="Скачать приложение для Windows 11"
            >
              <Download className="h-4 w-4" />
              Скачать EXE
            </a>
            <button
              onClick={() => setShowNew(true)}
              className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-semibold text-black transition hover:shadow-[0_0_28px_rgba(255,255,255,.18)]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Новая запись</span>
            </button>
          </div>
        </header>

        <div id="overview" className="mx-auto max-w-[1580px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs uppercase tracking-[.2em] text-white/35">
                Главная / Обзор
              </p>
              <h1 className="font-display text-4xl font-semibold sm:text-5xl">
                Панель администратора
              </h1>
              <p className="mt-2 text-sm text-white/45">Только данные из сохранённых заявок.</p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs ${
                workdayStatus.isOpen
                  ? "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200"
                  : "border-red-300/20 bg-red-400/[.08] text-red-200"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  workdayStatus.isOpen ? "bg-emerald-300" : "bg-red-400"
                }`}
              />
              <span>Часы работы: 10:00–20:00 · {workdayStatus.text}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {orderStats.map(({ label, value, note, icon: Icon }) => (
              <Panel
                key={label}
                className="group p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.055]"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[.07] text-white/70">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-white/20 transition group-hover:text-white/60" />
                </div>
                <p className="mt-6 text-xs text-white/45">{label}</p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-2 text-[11px] text-white/32">{note}</p>
              </Panel>
            ))}
          </div>

          <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.65fr)]">
            <Panel id="appointments" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-sans text-lg font-semibold">Все сохранённые записи</h2>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">
                      {appointments.length} записей
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/40">Даты указаны в каждой записи</p>
                </div>
                <button
                  onClick={() => setShowNew(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-xs text-white/65 transition hover:bg-white hover:text-black"
                >
                  <Plus className="h-3.5 w-3.5" /> Добавить
                </button>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-3 sm:px-6">
                {(["all", "new", "confirmed", "progress", "done"] as const).map((value) => {
                  const labels = {
                    all: "Все",
                    new: "Нужно позвонить",
                    confirmed: "Подтверждены",
                    progress: "В работе",
                    done: "Готово",
                  };
                  return (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`whitespace-nowrap rounded-xl px-3 py-2 text-[11px] transition ${filter === value ? "bg-white text-black" : "text-white/45 hover:bg-white/[.06] hover:text-white"}`}
                    >
                      {labels[value]}
                    </button>
                  );
                })}
              </div>

              <div className="sm:hidden p-4 pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Поиск"
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-white/[.07]">
                {visibleAppointments.length ? (
                  visibleAppointments.map((item) => (
                    <article
                      key={item.id}
                      className="group grid gap-4 p-4 transition hover:bg-white/[.025] sm:grid-cols-[64px_minmax(150px,1fr)_minmax(170px,1.1fr)_auto] sm:items-center sm:px-6"
                    >
                      <div className="flex items-center gap-3 sm:block">
                        <p className="text-base font-semibold">{item.time}</p>
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[.07] font-display text-lg">
                          {item.pet[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.pet}{" "}
                            <span className="font-normal text-white/35">· {item.breed}</span>
                          </p>
                          <p className="truncate text-[11px] text-white/38">
                            {item.owner} · {item.phone}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/75">{item.service}</p>
                        <p className="mt-1 text-xs font-medium text-white/45">{orderMeta(item)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <button
                          onClick={() => changeStatus(item)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] transition hover:brightness-125 ${STATUS[item.status].className}`}
                          title={
                            item.status === "new"
                              ? "Позвонить клиенту и подтвердить"
                              : item.status === "done"
                                ? "Запись завершена"
                                : "Перевести на следующий этап"
                          }
                        >
                          {item.status === "new" && <PhoneCall className="h-3 w-3" />}
                          {item.status === "done" && <Check className="h-3 w-3" />}
                          {STATUS[item.status].label}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingOrder(item)}
                          className="grid h-8 w-8 place-items-center rounded-xl text-red-200/45 transition hover:bg-red-300/10 hover:text-red-100"
                          aria-label={`Удалить запись для ${item.pet}`}
                          title="Удалить запись"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="px-6 py-14 text-center">
                    <Search className="mx-auto h-6 w-6 text-white/20" />
                    <p className="mt-3 text-sm text-white/55">
                      {appointments.length ? "Ничего не найдено" : "Заявок пока нет"}
                    </p>
                    <button
                      onClick={() => {
                        if (appointments.length) {
                          setQuery("");
                          setFilter("all");
                        } else {
                          setShowNew(true);
                        }
                      }}
                      className="mt-2 text-xs text-white/35 underline underline-offset-4"
                    >
                      {appointments.length ? "Сбросить фильтры" : "Добавить запись"}
                    </button>
                  </div>
                )}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel id="services-admin" className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-semibold">Услуги салона</h2>
                    <p className="mt-1 text-[11px] text-white/35">
                      {salonServices.length} услуг доступно для записи
                    </p>
                  </div>
                  <button
                    onClick={() => setShowServiceForm(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-black"
                  >
                    <Plus className="h-3.5 w-3.5" /> Добавить
                  </button>
                </div>
                <div className="admin-scrollbar mt-5 max-h-[290px] space-y-2 overflow-y-auto pr-2">
                  {salonServices.map((service, index) => (
                    <div
                      key={`${service.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{service.name}</p>
                        <p className="mt-1 text-[10px] text-white/35">
                          {service.duration} мин
                          {typeof service.id === "number" ? " · добавлена администратором" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-white/55">
                          от {service.price.toLocaleString("ru-RU")} ₽
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteSalonService(service.id, authSession.access_token);
                              const remoteServices = await fetchSalonServices();
                              setSalonServices(remoteServices ?? readSalonServices());
                              toast.success(`Услуга «${service.name}» удалена с сайта`);
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Не удалось удалить услугу",
                              );
                            }
                          }}
                          className="grid h-8 w-8 place-items-center rounded-xl border border-red-300/10 text-red-200/60 transition hover:bg-red-300/10 hover:text-red-100"
                          aria-label={`Удалить услугу ${service.name}`}
                          title="Удалить услугу"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel id="clients" className="p-5 sm:p-6 lg:col-span-3">
              <div>
                <h2 className="font-sans text-base font-semibold">Сводка по заявкам</h2>
                <p className="mt-1 text-xs text-white/35">
                  Рассчитано по данным, сохранённым в этом браузере
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Нужно позвонить", value: statusCounts.new, color: "text-amber-200" },
                  { label: "Подтверждены", value: statusCounts.confirmed, color: "text-sky-200" },
                  { label: "В работе", value: statusCounts.progress, color: "text-violet-200" },
                  { label: "Завершены", value: statusCounts.done, color: "text-emerald-200" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4"
                  >
                    <p className={`text-3xl font-semibold ${item.color}`}>{item.value}</p>
                    <p className="mt-2 text-[11px] text-white/40">{item.label}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel id="reviews-admin" className="overflow-hidden p-5 sm:p-6 lg:col-span-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-sans text-base font-semibold">
                    Новые отзывы на Яндекс Картах
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Виджет открыт сразу и показывает актуальные отзывы карточки салона «Лакки».
                  </p>
                </div>
                <Star className="h-5 w-5 shrink-0 text-amber-200" />
              </div>
              <div className="mx-auto mt-5 max-w-[800px] overflow-hidden rounded-2xl bg-white">
                <iframe
                  title="Новые отзывы о салоне Лакки на Яндекс Картах"
                  src={YANDEX_REVIEWS_WIDGET_URL}
                  loading="lazy"
                  className="block h-[680px] w-full border-0"
                />
              </div>
              <a
                href={YANDEX_REVIEWS_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-black transition hover:shadow-[0_0_24px_rgba(255,255,255,.15)]"
              >
                Открыть все отзывы на Яндекс Картах <ArrowUpRight className="h-4 w-4" />
              </a>
            </Panel>
          </div>
        </div>
      </main>

      {settingsOpen && (
        <section className="admin-scrollbar fixed inset-y-0 right-0 z-[60] overflow-y-auto bg-[#090909] lg:left-[284px]">
          <div className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-white/10 bg-[#090909]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
            <div>
              <p className="text-[10px] uppercase tracking-[.22em] text-white/35">
                Панель администратора
              </p>
              <h1 className="font-display text-2xl font-semibold">Настройки</h1>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "overview";
                setSettingsOpen(false);
              }}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть настройки"
              title="Вернуться к обзору"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div id="settings" className="mx-auto max-w-4xl px-4 py-8 sm:px-7 lg:px-9 lg:py-10">
            <div className="mb-7">
              <p className="text-xs uppercase tracking-[.2em] text-white/35">
                Настройки / Онлайн-запись
              </p>
              <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
                Параметры салона
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                Управляйте онлайн-записью и фотографиями галереи на основном сайте.
              </p>
            </div>

            <Panel className="p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[.07]">
                  <CalendarDays className="h-5 w-5 text-white/65" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-semibold">Глубина онлайн-записи</h3>
                  <p className="mt-1 text-xs leading-5 text-white/40">
                    По умолчанию клиент может выбрать дату максимум на 14 дней вперёд.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-white/10 pt-6">
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-white/40">
                    Дней вперёд
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={advanceDaysDraft}
                    onChange={(event) => setAdvanceDaysDraft(event.target.value)}
                    className="h-12 w-32 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm outline-none focus:border-white/30"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveBookingWindow}
                  className="h-12 rounded-2xl bg-white px-5 text-xs font-semibold text-black transition hover:shadow-[0_0_24px_rgba(255,255,255,.15)]"
                >
                  Сохранить изменения
                </button>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-white/35">
                Допустимое значение: от 1 до 365 дней. Настройка применяется к форме на сайте и к
                ручному добавлению записи.
              </p>
            </Panel>

            <Panel className="mt-4 p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[.07]">
                  <Upload className="h-5 w-5 text-white/65" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-semibold">Фотографии галереи</h3>
                  <p className="mt-1 text-xs leading-5 text-white/40">
                    Замените любую из трёх фотографий. Изменение сразу появится на основном сайте.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((index) => {
                  const slot = (index + 1) as GalleryImageSlot;
                  const isUploading = galleryUploading === slot;
                  const usesLogoFallback = index === 2 && !galleryImages[index];

                  return (
                    <div
                      key={slot}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-3"
                    >
                      <img
                        src={galleryImages[index] || GALLERY_FALLBACKS[index]}
                        alt={`Фотография №${slot} в галерее`}
                        className={`aspect-square w-full rounded-xl bg-black object-cover ${
                          usesLogoFallback ? "object-contain p-4" : ""
                        }`}
                      />
                      <label
                        className={`mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-black transition hover:shadow-[0_0_20px_rgba(255,255,255,.12)] ${
                          isUploading ? "pointer-events-none opacity-60" : ""
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" /> Загрузка…
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" /> Заменить №{slot}
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={galleryUploading !== null}
                          onChange={(event) => void changeGalleryImage(slot, event)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] leading-5 text-white/35">
                Поддерживаются JPG, PNG и WebP размером до 8 МБ.
              </p>
            </Panel>

            <Panel className="mt-4 p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-300/[.09] text-sky-200">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-semibold">Приложение для Windows 11</h3>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-white/40">
                      Скачайте LuckyAdmin.exe. После запуска защищённая админ-панель откроется
                      в отдельном окне Windows без обычных вкладок браузера.
                    </p>
                  </div>
                </div>
                <a
                  href={WINDOWS_APP_DOWNLOAD_URL}
                  download="LuckyAdmin.exe"
                  className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-xs font-semibold text-black transition hover:shadow-[0_0_24px_rgba(255,255,255,.15)]"
                >
                  <Download className="h-4 w-4" /> Скачать EXE
                </a>
              </div>
            </Panel>

            <Panel className="mt-4 flex items-center gap-4 p-5 sm:p-7">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[.07]">
                <PawPrint className="h-5 w-5 text-white/65" />
              </div>
              <div>
                <h3 className="font-sans text-sm font-semibold">Локальное хранение данных</h3>
                <p className="mt-1 text-[11px] leading-5 text-white/35">
                  Заявки хранятся в этом браузере. Услуги и фотографии сайта синхронизируются через Supabase.
                </p>
              </div>
            </Panel>
          </div>
        </section>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-appointment-title"
        >
          <form
            onSubmit={addAppointment}
            className="admin-scrollbar max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/15 bg-[#111] p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[.22em] text-white/35">Расписание</p>
                <h2 id="new-appointment-title" className="mt-1 font-display text-3xl font-semibold">
                  Новая запись
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <AdminField label="Имя владельца">
                <input name="owner" required placeholder="Екатерина Б." className="field" />
              </AdminField>
              <AdminField label="Телефон">
                <input
                  name="phone"
                  required
                  type="tel"
                  placeholder="+7 900 000-00-00"
                  className="field"
                />
              </AdminField>
              <AdminField label="Имя питомца">
                <input name="pet" required placeholder="Кокос" className="field" />
              </AdminField>
              <AdminField label="Порода">
                <input name="breed" required placeholder="Шпиц" className="field" />
              </AdminField>
              <AdminField label="Дата">
                <input
                  name="date"
                  required
                  type="date"
                  min={bookingDateBounds?.min}
                  max={bookingDateBounds?.max}
                  defaultValue={bookingDateBounds?.min}
                  className="field [color-scheme:dark]"
                />
              </AdminField>
              <AdminField label="Время">
                <input
                  name="time"
                  required
                  type="time"
                  min="10:00"
                  max="20:00"
                  step="1800"
                  defaultValue="18:00"
                  className="field"
                />
              </AdminField>
              <AdminField label="Стоимость">
                <input
                  name="price"
                  required
                  type="number"
                  min="0"
                  defaultValue="3500"
                  className="field"
                />
              </AdminField>
              <div className="sm:col-span-2">
                <AdminField label="Услуга">
                  <select name="service" className="field bg-[#111]">
                    {salonServices.map((service, index) => (
                      <option key={`${service.name}-${index}`}>{service.name}</option>
                    ))}
                  </select>
                </AdminField>
              </div>
            </div>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/55 hover:bg-white/[.06]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-black"
              >
                <CircleCheck className="h-4 w-4" /> Добавить запись
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmingOrder && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-order-title"
        >
          <div className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-[#111] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[.22em] text-amber-200/60">
                  Новая заявка
                </p>
                <h2 id="confirm-order-title" className="mt-1 font-display text-3xl font-semibold">
                  Позвоните клиенту
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[.06] p-4 text-xs leading-5 text-amber-100/80">
              Сначала свяжитесь с клиентом, проверьте услугу, дату и время. Только после этого
              подтвердите запись.
            </div>

            <dl className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-white/35">Клиент</dt>
                <dd className="mt-1 font-medium">{confirmingOrder.owner}</dd>
              </div>
              <div>
                <dt className="text-white/35">Телефон</dt>
                <dd className="mt-1 font-medium">{confirmingOrder.phone}</dd>
              </div>
              <div>
                <dt className="text-white/35">Питомец</dt>
                <dd className="mt-1 font-medium">
                  {confirmingOrder.pet} · {confirmingOrder.breed}
                </dd>
              </div>
              <div>
                <dt className="text-white/35">Дата и время</dt>
                <dd className="mt-1 font-medium">
                  {confirmingOrder.date
                    ? confirmingOrder.date.split("-").reverse().join(".")
                    : "Сегодня"}
                  , {confirmingOrder.time}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-white/35">Услуга</dt>
                <dd className="mt-1 font-medium">{confirmingOrder.service}</dd>
              </div>
            </dl>

            <a
              href={`tel:${confirmingOrder.phone.replace(/[^\d+]/g, "")}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[.06] px-4 py-3 text-sm font-medium transition hover:bg-white hover:text-black"
            >
              <PhoneCall className="h-4 w-4" /> Позвонить {confirmingOrder.phone}
            </a>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-4 text-xs leading-5 text-white/65">
              <input
                type="checkbox"
                checked={callChecked}
                onChange={(event) => setCallChecked(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-white"
              />
              <span>Я позвонил(а) клиенту, проверил(а) данные и получил(а) подтверждение.</span>
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/55 hover:bg-white/[.06]"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!callChecked}
                onClick={confirmAfterCall}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-30"
              >
                <CircleCheck className="h-4 w-4" /> Подтвердить запись
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingOrder && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-order-title"
        >
          <div className="w-full max-w-md rounded-[2rem] border border-red-300/20 bg-[#111] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[.22em] text-red-200/60">
                  Удаление записи
                </p>
                <h2 id="delete-order-title" className="mt-1 font-display text-3xl font-semibold">
                  Удалить безвозвратно?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm leading-6 text-white/70">
              <p className="font-medium text-white">
                {deletingOrder.pet} · {deletingOrder.owner}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {deletingOrder.date
                  ? deletingOrder.date.split("-").reverse().join(".")
                  : "Дата не указана"}
                , {deletingOrder.time} · {deletingOrder.service}
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-red-100/65">
              Запись будет удалена из этого браузера. Отменить это действие после подтверждения
              нельзя.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/55 hover:bg-white/[.06]"
              >
                Оставить запись
              </button>
              <button
                type="button"
                onClick={deleteAppointment}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-xs font-semibold text-white transition hover:bg-red-400"
              >
                <Trash2 className="h-4 w-4" /> Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {showServiceForm && (
        <div
          className="fixed inset-0 z-[75] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-service-title"
        >
          <form
            onSubmit={addService}
            className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-[#111] p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[.22em] text-white/35">Каталог</p>
                <h2 id="new-service-title" className="mt-1 font-display text-3xl font-semibold">
                  Добавить услугу
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceForm(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AdminField label="Название услуги">
                  <input
                    name="name"
                    required
                    placeholder="Например, экспресс-линька"
                    className="field"
                  />
                </AdminField>
              </div>
              <AdminField label="Длительность, минут">
                <input
                  name="duration"
                  required
                  type="number"
                  min="10"
                  step="5"
                  defaultValue="60"
                  className="field"
                />
              </AdminField>
              <AdminField label="Цена от, ₽">
                <input
                  name="price"
                  required
                  type="number"
                  min="0"
                  step="100"
                  defaultValue="1500"
                  className="field"
                />
              </AdminField>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-white/35">
              После сохранения услуга сразу появится на основном сайте у всех посетителей.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowServiceForm(false)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/55 hover:bg-white/[.06]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-black"
              >
                <Plus className="h-4 w-4" /> Добавить услугу
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-white/40">
        {label}
      </span>
      {children}
    </label>
  );
}
