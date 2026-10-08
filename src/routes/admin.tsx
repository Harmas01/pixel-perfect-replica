import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Plus,
  Search,
  Scissors,
  Settings,
  Sparkles,
  Star,
  UserRoundPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админ-панель — Лакки" },
      { name: "description", content: "Управление записями и клиентами салона груминга «Лакки»." },
    ],
  }),
  component: AdminPage,
});

type Status = "new" | "confirmed" | "progress" | "done";
type Appointment = {
  id: number;
  time: string;
  owner: string;
  pet: string;
  breed: string;
  service: string;
  price: number;
  status: Status;
  phone: string;
};

const START_APPOINTMENTS: Appointment[] = [
  { id: 1, time: "10:00", owner: "Анна К.", pet: "Кокос", breed: "Шпиц", service: "Комплексный груминг", price: 3500, status: "done", phone: "+7 921 455-18-24" },
  { id: 2, time: "11:30", owner: "Мария Л.", pet: "Боня", breed: "Йорк", service: "Стрижка и стайлинг", price: 2800, status: "progress", phone: "+7 911 230-47-10" },
  { id: 3, time: "13:00", owner: "Игорь С.", pet: "Ричи", breed: "Корги", service: "Купание и сушка", price: 2100, status: "confirmed", phone: "+7 921 104-35-66" },
  { id: 4, time: "15:00", owner: "Елена М.", pet: "Луна", breed: "Мальтипу", service: "Комплексный груминг", price: 3900, status: "confirmed", phone: "+7 950 221-86-03" },
  { id: 5, time: "17:00", owner: "Ольга Р.", pet: "Грей", breed: "Пудель", service: "Стрижка и стайлинг", price: 3200, status: "new", phone: "+7 981 403-90-12" },
];

const STATUS: Record<Status, { label: string; className: string }> = {
  new: { label: "Новая", className: "border-amber-400/20 bg-amber-400/10 text-amber-200" },
  confirmed: { label: "Подтверждена", className: "border-sky-400/20 bg-sky-400/10 text-sky-200" },
  progress: { label: "В работе", className: "border-violet-400/20 bg-violet-400/10 text-violet-200" },
  done: { label: "Готово", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
};

const NEXT_STATUS: Record<Status, Status> = {
  new: "confirmed",
  confirmed: "progress",
  progress: "done",
  done: "done",
};

const NAV = [
  { label: "Обзор", href: "#overview", icon: LayoutDashboard },
  { label: "Записи", href: "#appointments", icon: CalendarDays, badge: "5" },
  { label: "Клиенты", href: "#clients", icon: Users },
  { label: "Услуги", href: "#services-admin", icon: Scissors },
  { label: "Отзывы", href: "#reviews-admin", icon: Star, badge: "3" },
  { label: "Настройки", href: "#settings", icon: Settings },
] as const;

const STATS = [
  { label: "Записей сегодня", value: "8", note: "+2 к вчера", icon: CalendarDays },
  { label: "Выручка сегодня", value: "27 800 ₽", note: "+14% за неделю", icon: WalletCards },
  { label: "Новых клиентов", value: "3", note: "12 за этот месяц", icon: UserRoundPlus },
  { label: "Рейтинг", value: "4,9", note: "38 отзывов", icon: Star },
] as const;

function Panel({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`rounded-[1.6rem] border border-white/10 bg-white/[0.035] ${className}`}>{children}</section>;
}

function AdminPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [appointments, setAppointments] = useState(START_APPOINTMENTS);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("lucky-admin-appointments");
    if (saved) {
      try { setAppointments(JSON.parse(saved) as Appointment[]); } catch { /* keep demo data */ }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lucky-admin-appointments", JSON.stringify(appointments));
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return appointments.filter((item) => {
      const matchesFilter = filter === "all" || item.status === filter;
      const matchesQuery = !normalized || [item.owner, item.pet, item.breed, item.service, item.phone]
        .join(" ").toLocaleLowerCase("ru").includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [appointments, filter, query]);

  const changeStatus = (id: number) => {
    setAppointments((items) => items.map((item) => item.id === id ? { ...item, status: NEXT_STATUS[item.status] } : item));
    const current = appointments.find((item) => item.id === id);
    if (current?.status === "done") toast("Запись уже завершена");
    else toast.success("Статус записи обновлён");
  };

  const addAppointment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pet = String(data.get("pet") || "Новый питомец");
    setAppointments((items) => [...items, {
      id: Date.now(),
      time: String(data.get("time") || "18:00"),
      owner: String(data.get("owner") || "Новый клиент"),
      pet,
      breed: String(data.get("breed") || "Порода не указана"),
      service: String(data.get("service") || "Комплексный груминг"),
      price: Number(data.get("price")) || 3500,
      status: "new",
      phone: String(data.get("phone") || "Телефон не указан"),
    }].sort((a, b) => a.time.localeCompare(b.time)));
    setShowNew(false);
    event.currentTarget.reset();
    toast.success(`${pet}: запись добавлена`);
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white selection:bg-white selection:text-black">
      <Toaster position="top-right" />

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col border-r border-white/10 bg-[#0c0c0c] p-5 transition-transform duration-300 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Вернуться на сайт">
            <img src={logo} alt="Лакки" className="h-12 w-12 rounded-full border border-white/15 object-cover" />
            <div><p className="font-display text-xl font-semibold">Лакки</p><p className="text-[10px] uppercase tracking-[.22em] text-white/45">Управление салоном</p></div>
          </Link>
          <button onClick={() => setMobileMenu(false)} className="rounded-xl p-2 text-white/55 hover:bg-white/10 lg:hidden" aria-label="Закрыть меню"><X className="h-5 w-5" /></button>
        </div>

        <nav className="mt-10 space-y-1" aria-label="Навигация админ-панели">
          {NAV.map(({ label, href, icon: Icon, badge }, index) => (
            <a key={label} href={href} onClick={() => setMobileMenu(false)} className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition ${index === 0 ? "bg-white text-black" : "text-white/60 hover:bg-white/[.07] hover:text-white"}`}>
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
              {badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${index === 0 ? "bg-black/10" : "bg-white/10 text-white/70"}`}>{badge}</span>}
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-[1.4rem] border border-white/10 bg-white/[.04] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-semibold text-black">А</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Анна Петрова</p><p className="truncate text-xs text-white/45">Администратор</p></div>
            <MoreHorizontal className="h-4 w-4 text-white/40" />
          </div>
          <Link to="/" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs text-white/55 transition hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /> Вернуться на сайт</Link>
        </div>
      </aside>

      {mobileMenu && <button className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Закрыть меню" />}

      <main className="min-h-screen lg:ml-[284px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-white/10 bg-[#090909]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <button onClick={() => setMobileMenu(true)} className="rounded-xl border border-white/10 p-2.5 lg:hidden" aria-label="Открыть меню"><Menu className="h-5 w-5" /></button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти клиента, питомца или услугу" className="h-11 w-full rounded-2xl border border-white/10 bg-white/[.045] pl-10 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-white/30" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right md:block"><p className="text-xs font-medium">8 октября, четверг</p><p className="text-[11px] text-white/40">Санкт-Петербург</p></div>
            <button className="relative ml-3 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60 transition hover:text-white" aria-label="Уведомления"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white" /></button>
            <button onClick={() => setShowNew(true)} className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-semibold text-black transition hover:shadow-[0_0_28px_rgba(255,255,255,.18)]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Новая запись</span></button>
          </div>
        </header>

        <div id="overview" className="mx-auto max-w-[1580px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-1 text-xs uppercase tracking-[.2em] text-white/35">Главная / Обзор</p><h1 className="font-display text-4xl font-semibold sm:text-5xl">Добрый вечер, Анна</h1><p className="mt-2 text-sm text-white/45">Всё важное о работе салона на сегодня.</p></div>
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.06] px-3.5 py-2 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Салон открыт до 21:00</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map(({ label, value, note, icon: Icon }) => (
              <Panel key={label} className="group p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.055]">
                <div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[.07] text-white/70"><Icon className="h-[18px] w-[18px]" /></div><ArrowUpRight className="h-4 w-4 text-white/20 transition group-hover:text-white/60" /></div>
                <p className="mt-6 text-xs text-white/45">{label}</p><p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[11px] text-white/32">{note}</p>
              </Panel>
            ))}
          </div>

          <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.65fr)]">
            <Panel id="appointments" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                <div><div className="flex items-center gap-2"><h2 className="font-sans text-lg font-semibold">Расписание на сегодня</h2><span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">{appointments.length} записей</span></div><p className="mt-1 text-xs text-white/40">Четверг, 8 октября</p></div>
                <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-xs text-white/65 transition hover:bg-white hover:text-black"><Plus className="h-3.5 w-3.5" /> Добавить</button>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-3 sm:px-6">
                {(["all", "new", "confirmed", "progress", "done"] as const).map((value) => {
                  const labels = { all: "Все", new: "Новые", confirmed: "Подтверждены", progress: "В работе", done: "Готово" };
                  return <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[11px] transition ${filter === value ? "bg-white text-black" : "text-white/45 hover:bg-white/[.06] hover:text-white"}`}>{labels[value]}</button>;
                })}
              </div>

              <div className="sm:hidden p-4 pb-0"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" className="h-10 w-full rounded-xl border border-white/10 bg-white/[.04] pl-9 pr-3 text-xs outline-none" /></div></div>

              <div className="divide-y divide-white/[.07]">
                {visibleAppointments.length ? visibleAppointments.map((item) => (
                  <article key={item.id} className="group grid gap-4 p-4 transition hover:bg-white/[.025] sm:grid-cols-[64px_minmax(150px,1fr)_minmax(170px,1.1fr)_auto] sm:items-center sm:px-6">
                    <div className="flex items-center gap-3 sm:block"><p className="text-base font-semibold">{item.time}</p><p className="text-[10px] text-white/30">60–90 мин</p></div>
                    <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[.07] font-display text-lg">{item.pet[0]}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{item.pet} <span className="font-normal text-white/35">· {item.breed}</span></p><p className="truncate text-[11px] text-white/38">{item.owner} · {item.phone}</p></div></div>
                    <div className="min-w-0"><p className="truncate text-sm text-white/75">{item.service}</p><p className="mt-1 text-xs font-medium text-white/45">{item.price.toLocaleString("ru-RU")} ₽</p></div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end"><button onClick={() => changeStatus(item.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] transition hover:brightness-125 ${STATUS[item.status].className}`} title={item.status === "done" ? "Запись завершена" : "Перевести на следующий этап"}>{item.status === "done" && <Check className="h-3 w-3" />}{STATUS[item.status].label}</button><button className="grid h-8 w-8 place-items-center rounded-xl text-white/25 transition hover:bg-white/10 hover:text-white" aria-label={`Действия для ${item.pet}`}><MoreHorizontal className="h-4 w-4" /></button></div>
                  </article>
                )) : <div className="px-6 py-14 text-center"><Search className="mx-auto h-6 w-6 text-white/20" /><p className="mt-3 text-sm text-white/55">Ничего не найдено</p><button onClick={() => { setQuery(""); setFilter("all"); }} className="mt-2 text-xs text-white/35 underline underline-offset-4">Сбросить фильтры</button></div>}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel className="p-5 sm:p-6">
                <div className="flex items-center justify-between"><h2 className="font-sans text-base font-semibold">Быстрые действия</h2><Sparkles className="h-4 w-4 text-white/35" /></div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button onClick={() => setShowNew(true)} className="rounded-2xl bg-white p-4 text-left text-black transition hover:-translate-y-0.5"><CalendarDays className="h-5 w-5" /><p className="mt-5 text-xs font-semibold">Новая запись</p><p className="mt-1 text-[10px] text-black/50">Добавить клиента</p></button>
                  <button onClick={() => toast("Открываем базу клиентов")} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.07]"><Users className="h-5 w-5 text-white/65" /><p className="mt-5 text-xs font-semibold">Клиенты</p><p className="mt-1 text-[10px] text-white/35">Найти карточку</p></button>
                  <button onClick={() => toast.success("Напоминания отправлены")} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.07]"><MessageCircle className="h-5 w-5 text-white/65" /><p className="mt-5 text-xs font-semibold">Напомнить</p><p className="mt-1 text-[10px] text-white/35">О визите сегодня</p></button>
                  <button onClick={() => window.print()} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.07]"><WalletCards className="h-5 w-5 text-white/65" /><p className="mt-5 text-xs font-semibold">Отчёт</p><p className="mt-1 text-[10px] text-white/35">За текущий день</p></button>
                </div>
              </Panel>

              <Panel id="services-admin" className="p-5 sm:p-6">
                <div className="flex items-center justify-between"><div><h2 className="font-sans text-base font-semibold">Загрузка мастеров</h2><p className="mt-1 text-[11px] text-white/35">Сегодня</p></div><button className="text-[11px] text-white/45 hover:text-white">График</button></div>
                <div className="mt-5 space-y-4">
                  {[{ name: "Анна", value: 82, jobs: "5 записей" }, { name: "Мария", value: 64, jobs: "4 записи" }, { name: "Елена", value: 45, jobs: "3 записи" }].map((master) => (
                    <div key={master.name}><div className="mb-2 flex items-center justify-between text-xs"><span>{master.name}</span><span className="text-white/35">{master.jobs}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-white" style={{ width: `${master.value}%` }} /></div></div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel id="clients" className="p-5 sm:p-6 lg:col-span-2">
              <div className="flex items-center justify-between"><div><h2 className="font-sans text-base font-semibold">Клиенты возвращаются</h2><p className="mt-1 text-xs text-white/35">Повторные визиты за последние 7 месяцев</p></div><button className="flex items-center gap-1 text-[11px] text-white/45 hover:text-white">Подробнее <ChevronRight className="h-3.5 w-3.5" /></button></div>
              <div className="mt-7 flex h-44 items-end gap-2 sm:gap-4" aria-label="График повторных визитов">
                {[48, 63, 55, 76, 69, 88, 81].map((height, index) => <div key={index} className="group flex h-full flex-1 items-end"><div className="relative w-full rounded-t-xl bg-white/[.09] transition group-hover:bg-white/25" style={{ height: `${height}%` }}><span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 text-[10px] text-white/55 group-hover:block">{height}%</span></div></div>)}
              </div>
              <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-white/30">{["Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт"].map((month) => <span key={month}>{month}</span>)}</div>
            </Panel>

            <Panel id="reviews-admin" className="p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><h2 className="font-sans text-base font-semibold">Новые отзывы</h2><p className="mt-1 text-xs text-white/35">Требуют ответа</p></div><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">3</span></div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium">Екатерина Б.</p><div className="flex gap-0.5 text-amber-200">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</div></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-white/45">Спасибо огромное мастеру Анне за чудесный уход. Питомец выглядел как с обложки!</p><button onClick={() => toast.success("Ответ сохранён")} className="mt-4 flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white"><MessageCircle className="h-3.5 w-3.5" /> Ответить</button></div>
            </Panel>
          </div>

          <Panel id="settings" className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[.07]"><PawPrint className="h-5 w-5 text-white/65" /></div><div><h2 className="font-sans text-sm font-semibold">Данные синхронизированы</h2><p className="mt-1 text-[11px] text-white/35">Последнее локальное сохранение — только что</p></div></div>
            <button onClick={() => toast("Настройки салона готовы к подключению")} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60 transition hover:bg-white hover:text-black">Настройки салона</button>
          </Panel>
        </div>
      </main>

      {showNew && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="new-appointment-title">
          <form onSubmit={addAppointment} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/15 bg-[#111] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.22em] text-white/35">Расписание</p><h2 id="new-appointment-title" className="mt-1 font-display text-3xl font-semibold">Новая запись</h2></div><button type="button" onClick={() => setShowNew(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Закрыть"><X className="h-4 w-4" /></button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <AdminField label="Имя владельца"><input name="owner" required placeholder="Екатерина Б." className="field" /></AdminField>
              <AdminField label="Телефон"><input name="phone" required type="tel" placeholder="+7 900 000-00-00" className="field" /></AdminField>
              <AdminField label="Имя питомца"><input name="pet" required placeholder="Кокос" className="field" /></AdminField>
              <AdminField label="Порода"><input name="breed" required placeholder="Шпиц" className="field" /></AdminField>
              <AdminField label="Время"><input name="time" required type="time" defaultValue="18:00" className="field" /></AdminField>
              <AdminField label="Стоимость"><input name="price" required type="number" min="0" defaultValue="3500" className="field" /></AdminField>
              <div className="sm:col-span-2"><AdminField label="Услуга"><select name="service" className="field bg-[#111]"><option>Комплексный груминг</option><option>Купание и сушка</option><option>Стрижка и стайлинг</option><option>Стрижка когтей</option></select></AdminField></div>
            </div>
            <div className="mt-7 flex gap-3"><button type="button" onClick={() => setShowNew(false)} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/55 hover:bg-white/[.06]">Отмена</button><button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-black"><CircleCheck className="h-4 w-4" /> Добавить запись</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-white/40">{label}</span>{children}</label>;
}
