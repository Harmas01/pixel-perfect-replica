import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { appendOrder, isTimeSlotTakenRemote } from "@/lib/orders";
import {
  DEFAULT_SALON_SERVICES,
  fetchSalonServices,
  readSalonServices,
  SERVICES_UPDATED_EVENT,
  type SalonService,
} from "@/lib/services";
import {
  BOOKING_SETTINGS_UPDATED_EVENT,
  getBookingDateBounds,
  readBookingSettings,
} from "@/lib/settings";
import { fetchGalleryImageUrls, GALLERY_IMAGES_UPDATED_EVENT, type GalleryImageItem } from "@/lib/site-content";
import logo from "@/assets/logo.png";
import heroDog from "@/assets/hero-dog.jpg";
import aboutImg from "@/assets/about-dog.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Лакки — салон груминга для собак" },
      {
        name: "description",
        content:
          "Бутик-салон груминга «Лакки»: бережный уход, профессиональные стрижки, купание и сушка. Запишитесь на приём сегодня.",
      },
      { property: "og:title", content: "Лакки — салон груминга для собак" },
      {
        property: "og:description",
        content:
          "Бережный уход, профессиональный груминг и немного больше любви для каждой собаки.",
      },
    ],
  }),
  component: Index,
});

const NAV = [
  ["Главная", "#home"],
  ["Услуги", "#services"],
  ["О нас", "#about"],
  ["Отзывы", "#reviews"],
  ["Контакты", "#contacts"],
  ["Галерея", "#gallery"],
] as const;

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <ellipse cx="32" cy="42" rx="12" ry="10" />
      <ellipse cx="17" cy="26" rx="5" ry="7" />
      <ellipse cx="27" cy="16" rx="5" ry="7" />
      <ellipse cx="37" cy="16" rx="5" ry="7" />
      <ellipse cx="47" cy="26" rx="5" ry="7" />
    </svg>
  );
}

const icon = (d: ReactNode) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-10 w-10"
  >
    {d}
  </svg>
);
const ICONS = {
  full: icon(
    <>
      <circle cx="14" cy="34" r="5" />
      <circle cx="14" cy="14" r="5" />
      <path d="M18 17 40 34M18 31 40 14" />
    </>,
  ),
  bath: icon(
    <>
      <path d="M6 24h36v4a10 10 0 0 1-10 10H16A10 10 0 0 1 6 28z" />
      <path d="M12 24V10a4 4 0 0 1 8 0" />
      <circle cx="28" cy="14" r="2" />
      <circle cx="34" cy="10" r="1.5" />
    </>,
  ),
  cut: icon(
    <>
      <path d="M8 10h32v6H8z" />
      <path d="M12 16v22M18 16v18M24 16v22M30 16v18M36 16v22" />
    </>,
  ),
  nail: icon(
    <>
      <path d="M16 8c8 0 14 6 14 16v16H18V24c0-6-2-10-2-16z" />
      <path d="M18 30h12" />
    </>,
  ),
  ear: icon(
    <>
      <path d="M30 40c-6 0-8-6-12-8-4-3-6-6-6-12a12 12 0 0 1 24 0c0 4-4 6-4 10" />
      <path d="M24 20a4 4 0 0 1 4 4" />
    </>,
  ),
  coat: icon(
    <>
      <path d="M24 40s-14-8-14-20a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 12-14 20-14 20z" />
    </>,
  ),
};

const SERVICES = [
  {
    k: "full",
    t: "Комплексный груминг",
    d: "Полный уход: купание, стрижка, когти, уши и финальный стайлинг.",
    p: "от 3 500 ₽",
  },
  {
    k: "bath",
    t: "Купание и сушка",
    d: "Мягкий шампунь, кондиционирующая маска и нежная пушистая сушка.",
    p: "от 1 800 ₽",
  },
  {
    k: "cut",
    t: "Стрижка и стайлинг",
    d: "Стрижки по стандарту породы или креативные — с ювелирной точностью.",
    p: "от 2 500 ₽",
  },
  {
    k: "nail",
    t: "Стрижка когтей",
    d: "Аккуратная обрезка и полировка для здоровых и удобных лапок.",
    p: "от 500 ₽",
  },
  {
    k: "ear",
    t: "Чистка ушей",
    d: "Гигиеничный и деликатный уход за ушами — чисто и спокойно.",
    p: "от 400 ₽",
  },
  {
    k: "coat",
    t: "Уход за лапами и шерстью",
    d: "Бальзам для лап, распутывание колтунов и питательные маски для шерсти.",
    p: "от 900 ₽",
  },
] as const;

const ADVANTAGES = [
  "Профессиональные грумеры",
  "Индивидуальный подход",
  "Чистый и уютный салон",
  "Бережное обращение без стресса",
];

const YANDEX_REVIEWS_WIDGET_URL =
  "https://yandex.ru/maps-reviews-widget/184039255742?comments";
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }),
      { threshold: 0.12 },
    );

    const observeRevealElements = (root: ParentNode) => {
      if (root instanceof Element && root.matches(".reveal:not(.in)")) {
        io.observe(root);
      }
      root.querySelectorAll?.(".reveal:not(.in)").forEach((element) => io.observe(element));
    };

    observeRevealElements(document);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) observeRevealElements(node);
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      io.disconnect();
    };
  }, []);
}

function useSalonServices() {
  const [services, setServices] = useState<SalonService[]>(DEFAULT_SALON_SERVICES);

  useEffect(() => {
    let active = true;
    const refreshServices = () => {
      setServices(readSalonServices());
      void fetchSalonServices().then((remoteServices) => {
        if (active && remoteServices) setServices(remoteServices);
      });
    };

    refreshServices();
    window.addEventListener("storage", refreshServices);
    window.addEventListener(SERVICES_UPDATED_EVENT, refreshServices);
    return () => {
      active = false;
      window.removeEventListener("storage", refreshServices);
      window.removeEventListener(SERVICES_UPDATED_EVENT, refreshServices);
    };
  }, []);

  return services;
}

function useGalleryImages() {
  const [images, setImages] = useState<GalleryImageItem[]>([]);

  useEffect(() => {
    let active = true;
    const refreshImages = () => {
      void fetchGalleryImageUrls().then((nextImages) => {
        if (active) setImages(nextImages);
      });
    };

    refreshImages();
    window.addEventListener("storage", refreshImages);
    window.addEventListener(GALLERY_IMAGES_UPDATED_EVENT, refreshImages);
    return () => {
      active = false;
      window.removeEventListener("storage", refreshImages);
      window.removeEventListener(GALLERY_IMAGES_UPDATED_EVENT, refreshImages);
    };
  }, []);

  return images;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-script text-3xl text-glow md:text-4xl">{children}</p>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 30);
    f();
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "border-b border-line bg-background/85 backdrop-blur-md" : ""}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <a href="#home" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Логотип Лакки"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full"
          />
          <span className="font-script text-3xl text-glow">Лакки</span>
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map(([l, h]) => (
            <a
              key={h}
              href={h}
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l}
            </a>
          ))}
          <a href="#booking" className="btn-outline !py-2.5">
            Записаться
          </a>
        </nav>
        <button className="lg:hidden" aria-label="Меню" onClick={() => setOpen(!open)}>
          <div className="space-y-1.5">
            <span className="block h-px w-7 bg-foreground" />
            <span className="block h-px w-7 bg-foreground" />
            <span className="block h-px w-5 bg-foreground" />
          </div>
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-5 border-t border-line bg-background px-6 py-6 lg:hidden">
          {NAV.map(([l, h]) => (
            <a
              key={h}
              href={h}
              onClick={() => setOpen(false)}
              className="text-sm uppercase tracking-[0.2em]"
            >
              {l}
            </a>
          ))}
          <a href="#booking" onClick={() => setOpen(false)} className="btn-outline">
            Записаться
          </a>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen items-center overflow-hidden">
      <img
        src={heroDog}
        alt="Ухоженный французский бульдог"
        width={1600}
        height={1008}
        className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-70 md:opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      <div className="spin-slow pointer-events-none absolute -left-40 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full border border-line" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full border border-dashed border-line" />
      <Paw className="floaty absolute right-[8%] top-[18%] h-10 w-10 text-foreground/25 [--r:20deg]" />
      <Paw className="floaty absolute bottom-[16%] left-[46%] h-7 w-7 text-foreground/20 [--r:-15deg] [animation-delay:2s]" />
      <div className="relative mx-auto w-full max-w-7xl px-5 pt-24 md:px-8">
        <div className="max-w-2xl reveal">
          <Eyebrow>салон груминга «Лакки»</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-8xl">
            Профессиональный груминг для вашего <em className="text-glow">лучшего друга</em>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Бережный уход, профессиональный груминг и немного больше любви для каждой собаки.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#booking" className="btn-solid">
              Записаться на приём
            </a>
            <a href="#services" className="btn-outline">
              Наши услуги
            </a>
          </div>
        </div>
      </div>
      <a
        href="#services"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
      >
        Листайте вниз
      </a>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  center = true,
}: {
  eyebrow: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={`reveal mb-14 ${center ? "text-center" : ""}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 text-4xl font-semibold md:text-6xl">{title}</h2>
      <div className={`mt-6 flex items-center gap-3 ${center ? "justify-center" : ""}`}>
        <span className="h-px w-12 bg-border" />
        <Paw className="h-4 w-4" />
        <span className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}

function Services() {
  const availableServices = useSalonServices();
  const visibleServices = availableServices.map((service) => {
    const preset = SERVICES.find((item) => item.t === service.name);
    return {
      id: String(service.id),
      title: service.name,
      description:
        preset?.d ??
        `Профессиональный уход с учётом особенностей питомца. Продолжительность — ${service.duration} мин.`,
      price: `от ${service.price.toLocaleString("ru-RU")} ₽`,
      icon: ICONS[preset?.k ?? "full"],
    };
  });

  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-28 md:px-8">
      <SectionTitle eyebrow="что мы делаем" title="Наши услуги" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleServices.map((service, index) => (
          <div
            key={service.id}
            style={{ transitionDelay: `${index * 110}ms` }}
            className="reveal service-reveal h-full"
          >
            <article className="card-line group flex h-full flex-col p-8 hover:-translate-y-2 hover:border-foreground hover:shadow-glow">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border transition-all duration-500 group-hover:border-foreground group-hover:shadow-glow">
                {service.icon}
              </div>
              <h3 className="mt-6 text-3xl font-semibold">{service.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
              <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
                <span className="font-display text-xl">{service.price}</span>
                <a
                  href="#booking"
                  className="text-xs uppercase tracking-[0.2em] underline-offset-8 group-hover:underline"
                >
                  Записаться
                </a>
              </div>
            </article>
          </div>
        ))}
      </div>
      {!visibleServices.length && (
        <div className="card-line reveal py-14 text-center text-sm text-muted-foreground">
          Услуги временно недоступны. Пожалуйста, свяжитесь с администратором.
        </div>
      )}
    </section>
  );
}

function About() {
  return (
    <section id="about" className="border-y border-line py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 md:px-8 lg:grid-cols-2">
        <div className="reveal relative">
          <div className="absolute -inset-4 rounded-[2rem] border border-line" />
          <img
            src={aboutImg}
            alt="Ухоженная собака после груминга в салоне Лакки"
            loading="lazy"
            width={1008}
            height={1200}
            className="relative aspect-[4/5] w-full rounded-[1.5rem] object-cover"
          />
          <div className="absolute -bottom-6 -right-4 rounded-full border border-foreground bg-background px-6 py-4 shadow-glow md:-right-8">
            <span className="font-script text-2xl">с любовью</span>
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="о салоне" title="Забота, которой можно доверять" center={false} />
          <p className="reveal text-lg leading-relaxed text-muted-foreground">
            «Лакки» — бутик-салон, где каждая собака получает профессиональный, бережный и
            индивидуальный уход. Мы знакомимся с каждым гостем, подбираем косметику под его шерсть и
            кожу и работаем спокойно, чтобы каждый визит был комфортным.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {ADVANTAGES.map((a) => (
              <li key={a} className="reveal flex items-center gap-3 border-b border-line pb-4">
                <Paw className="h-5 w-5 shrink-0" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Why() {
  const items = [
    ["500+", "Счастливых собак"],
    ["2", "Года профессиональной заботы"],
    ["∞", "Любви в каждой детали"],
  ];
  return (
    <section className="relative overflow-hidden border-y border-line py-24">
      <Paw className="absolute -right-10 -top-10 h-64 w-64 text-foreground/5" />
      <div className="mx-auto grid max-w-5xl gap-10 px-5 sm:grid-cols-3 md:px-8">
        {items.map(([n, l], i) => (
          <div key={l} style={{ transitionDelay: `${i * 90}ms` }} className="reveal text-center">
            <div className="font-display text-7xl font-semibold text-glow md:text-8xl">{n}</div>
            <div className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Gallery() {
  const galleryImages = useGalleryImages();
  const photos = galleryImages.length
    ? galleryImages.map((image, index) => {
        const caption = image.caption.trim() || "Работа салона «Лакки»";
        return {
          id: image.id,
          src: image.url,
          alt: caption,
          label: caption,
          className: index === 0 ? "md:col-span-2 md:row-span-2" : "",
          imageClassName: "object-cover",
        };
      })
    : [
        {
          id: "fallback-hero",
          src: heroDog,
          alt: "Ухоженная собака после груминга в салоне Лакки",
          label: "Бережный уход",
          className: "md:col-span-2 md:row-span-2",
          imageClassName: "object-cover object-[70%_center]",
        },
        {
          id: "fallback-about",
          src: aboutImg,
          alt: "Ухоженная собака после груминга в салоне Лакки",
          label: "Забота в каждой детали",
          className: "",
          imageClassName: "object-cover",
        },
        {
          id: "fallback-logo",
          src: logo,
          alt: "Логотип салона груминга Лакки",
          label: "Салон «Лакки»",
          className: "",
          imageClassName: "object-contain p-10",
        },
      ];

  return (
    <section id="gallery" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-28 md:px-8">
      <SectionTitle eyebrow="наша атмосфера" title="Галерея «Лакки»" />
      <div className="grid auto-rows-[280px] gap-4 md:grid-cols-3 md:auto-rows-[240px]">
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            className={`reveal group relative overflow-hidden rounded-[1.6rem] border border-border bg-card ${photo.className}`}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className={`h-full w-full transition duration-700 group-hover:scale-[1.03] ${photo.imageClassName}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <figcaption className="absolute bottom-0 left-0 p-6 text-sm uppercase tracking-[0.2em] text-white">
              {photo.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Reviews() {
  const [showMore, setShowMore] = useState(false);

  return (
    <section id="reviews" className="mx-auto max-w-7xl px-5 py-28 md:px-8">
      <SectionTitle eyebrow="тёплые слова" title="Отзывы наших клиентов" />
      <div className="reveal mx-auto max-w-[752px] overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_24px_80px_rgba(255,255,255,.08)]">
        <iframe
          id="yandex-reviews-widget"
          title="Свежие отзывы о салоне Лакки на Яндекс Картах"
          src={YANDEX_REVIEWS_WIDGET_URL}
          loading="lazy"
          scrolling="yes"
          className={`block w-[calc(100%+48px)] max-w-none border-0 bg-white transition-[height] duration-700 ease-out ${showMore ? "h-[1180px]" : "h-[680px]"}`}
        />
      </div>
      <div className="mt-7 flex justify-center">
        <button
          type="button"
          className="btn-solid"
          aria-expanded={showMore}
          aria-controls="yandex-reviews-widget"
          onClick={() => setShowMore((value) => !value)}
        >
          {showMore ? "Свернуть отзывы ↑" : "Посмотреть больше отзывов ↓"}
        </button>
      </div>
    </section>
  );
}

function Booking() {
  const availableServices = useSalonServices();
  const [bookingWindow, setBookingWindow] = useState<{
    advanceDays: number;
    min: string;
    max: string;
  } | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    const refreshBookingWindow = () => {
      const settings = readBookingSettings();
      setBookingWindow({
        advanceDays: settings.advanceDays,
        ...getBookingDateBounds(settings.advanceDays),
      });
    };
    refreshBookingWindow();
    window.addEventListener("storage", refreshBookingWindow);
    window.addEventListener(BOOKING_SETTINGS_UPDATED_EVENT, refreshBookingWindow);
    return () => {
      window.removeEventListener("storage", refreshBookingWindow);
      window.removeEventListener(BOOKING_SETTINGS_UPDATED_EVENT, refreshBookingWindow);
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const time = String(data.get("time"));

    if (!bookingWindow || date < bookingWindow.min || date > bookingWindow.max) {
      toast.error(
        bookingWindow
          ? `Выберите дату с ${bookingWindow.min.split("-").reverse().join(".")} по ${bookingWindow.max.split("-").reverse().join(".")}`
          : "Подождите, пока загрузятся доступные даты",
      );
      return;
    }

    if (time < "10:00" || time > "20:00") {
      toast.error("Выберите время в пределах рабочего дня: с 10:00 до 20:00.");
      return;
    }

    setBookingSubmitting(true);
    try {
      if (await isTimeSlotTakenRemote(date, time)) {
        toast.error("Это время уже занято. Выберите другую дату или время.");
        return;
      }

      await appendOrder({
        id: Date.now(),
        owner: String(data.get("owner")),
        phone: String(data.get("phone")),
        pet: String(data.get("pet")),
        breed: String(data.get("breed") || "Не указана"),
        service: String(data.get("service")),
        date,
        time,
        note: String(data.get("note") || ""),
        price: 0,
        status: "new",
        source: "website",
        createdAt: new Date().toISOString(),
      });
      toast.success("Заявка принята. Администратор получит уведомление и позвонит вам.");
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить заявку");
    } finally {
      setBookingSubmitting(false);
    }
  };
  const L = ({ children }: { children: ReactNode }) => (
    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
  return (
    <section id="booking" className="border-y border-line py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="reveal">
          <Eyebrow>запись на визит</Eyebrow>
          <h2 className="mt-2 text-5xl font-semibold leading-tight md:text-6xl">
            Ваша собака заслуживает <em className="text-glow">нового образа</em>
          </h2>
          <p className="mt-6 max-w-sm text-muted-foreground">
            Оставьте заявку, и наш администратор свяжется с вами, чтобы подтвердить время.
          </p>
          <img
            src={logo}
            alt=""
            loading="lazy"
            className="mt-10 hidden h-48 w-48 rounded-full shadow-glow lg:block"
          />
        </div>
        <form
          onSubmit={onSubmit}
          className="reveal card-line grid gap-5 p-6 sm:grid-cols-2 md:p-10"
        >
          <label>
            <L>Имя владельца</L>
            <input name="owner" required className="field" placeholder="Анна" />
          </label>
          <label>
            <L>Номер телефона</L>
            <input
              name="phone"
              required
              type="tel"
              className="field"
              placeholder="+7 900 000-00-00"
            />
          </label>
          <label>
            <L>Имя собаки</L>
            <input name="pet" required className="field" placeholder="Лакки" />
          </label>
          <label>
            <L>Порода</L>
            <input name="breed" className="field" placeholder="Французский бульдог" />
          </label>
          <label className="sm:col-span-2">
            <L>Услуга</L>
            <select name="service" required className="field" defaultValue="">
              <option value="" disabled className="bg-background">
                Выберите услугу
              </option>
              {availableServices.map((service) => (
                <option key={service.id} className="bg-background">
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <L>Желаемая дата</L>
            <input
              name="date"
              required
              type="date"
              min={bookingWindow?.min}
              max={bookingWindow?.max}
              className="field [color-scheme:dark]"
            />
            {bookingWindow && (
              <span className="mt-2 block text-[11px] text-muted-foreground">
                Запись доступна на {bookingWindow.advanceDays} дней вперёд
              </span>
            )}
          </label>
          <label>
            <L>Желаемое время</L>
            <input
              name="time"
              required
              type="time"
              min="10:00"
              max="20:00"
              step="1800"
              className="field [color-scheme:dark]"
            />
          </label>
          <label className="sm:col-span-2">
            <L>Дополнительные пожелания</L>
            <textarea
              name="note"
              rows={3}
              className="field"
              placeholder="Что нам важно знать о вашей собаке"
            />
          </label>
          <button
            type="submit"
            disabled={bookingSubmitting}
            className="btn-solid sm:col-span-2 disabled:cursor-wait disabled:opacity-60"
          >
            {bookingSubmitting ? "Отправляем заявку…" : "Записаться на приём"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Contacts() {
  const rows = [
    ["Телефон", "+7 (900) 123-45-67"],
    ["WhatsApp / Telegram", "@lucky_grooming"],
    ["Адрес", "ул. Тазаева, 3, Колпино"],
    ["Часы работы", "Ежедневно 10:00 – 20:00"],
  ];
  return (
    <section id="contacts" className="mx-auto max-w-7xl px-5 py-28 md:px-8">
      <SectionTitle eyebrow="как нас найти" title="Контакты" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="reveal card-line divide-y divide-[var(--line)] p-8">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 py-5 sm:flex-row sm:justify-between">
              <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{k}</span>
              <span className="font-display text-2xl">{v}</span>
            </div>
          ))}
          <div className="flex gap-3 pt-6">
            {["Instagram", "Telegram", "VK"].map((s) => (
              <a key={s} href="#" className="btn-outline !px-5 !py-2 !text-[10px]">
                {s}
              </a>
            ))}
          </div>
        </div>
        <div className="reveal relative min-h-[420px] overflow-hidden rounded-[1.5rem] border border-border">
          <iframe
            title="Лакки на Яндекс Картах"
            className="absolute inset-0 h-full w-full grayscale invert-[.9] contrast-125"
            loading="lazy"
            allowFullScreen
            src="https://yandex.ru/map-widget/v1/?ll=30.608306%2C59.741463&z=17&pt=30.608306%2C59.741463%2Cpm2rdl"
          />
          <a
            href="https://yandex.ru/maps/?ll=30.608306%2C59.741463&z=17&pt=30.608306%2C59.741463%2Cpm2rdl"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 left-4 rounded-full border border-foreground bg-background/90 px-5 py-3 text-xs uppercase tracking-[0.18em] shadow-glow backdrop-blur-md"
          >
            Открыть в Яндекс Картах ↗
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 text-center md:grid-cols-3 md:items-center md:px-8 md:text-left">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <img
            src={logo}
            alt="Логотип Лакки"
            loading="lazy"
            className="h-28 w-28 rounded-full shadow-glow"
          />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {NAV.map(([l, h]) => (
            <a
              key={h}
              href={h}
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>+7 (900) 123-45-67</p>
          <p>ул. Тазаева, 3, Колпино</p>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} Лакки · салон груминга</p>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  useReveal();
  return (
    <main>
      <Header />
      <Hero />
      <Services />
      <About />
      <Why />
      <Reviews />
      <Booking />
      <Contacts />
      <Gallery />
      <Footer />
      <Toaster />
    </main>
  );
}
