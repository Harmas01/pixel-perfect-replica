import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import logo from "@/assets/logo.png";
import heroDog from "@/assets/hero-dog.jpg";
import aboutImg from "@/assets/about.jpg";
import beforeImg from "@/assets/before.jpg";
import afterImg from "@/assets/after.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Лакки — салон груминга для собак" },
      { name: "description", content: "Бутик-салон груминга «Лакки»: бережный уход, профессиональные стрижки, купание и сушка. Запишитесь на приём сегодня." },
      { property: "og:title", content: "Лакки — салон груминга для собак" },
      { property: "og:description", content: "Бережный уход, профессиональный груминг и немного больше любви для каждой собаки." },
    ],
  }),
  component: Index,
});

const NAV = [
  ["Главная", "#home"], ["Услуги", "#services"], ["О нас", "#about"],
  ["Галерея", "#gallery"], ["Отзывы", "#reviews"], ["Контакты", "#contacts"],
] as const;

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <ellipse cx="32" cy="42" rx="12" ry="10" />
      <ellipse cx="17" cy="26" rx="5" ry="7" />
      <ellipse cx="27" cy="16" rx="5" ry="7" />
      <ellipse cx="37" cy="16" rx="5" ry="7" />
      <ellipse cx="47" cy="26" rx="5" ry="7" />
    </svg>
  );
}

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">{d}</svg>
);
const ICONS = {
  full: icon(<><circle cx="14" cy="34" r="5" /><circle cx="14" cy="14" r="5" /><path d="M18 17 40 34M18 31 40 14" /></>),
  bath: icon(<><path d="M6 24h36v4a10 10 0 0 1-10 10H16A10 10 0 0 1 6 28z" /><path d="M12 24V10a4 4 0 0 1 8 0" /><circle cx="28" cy="14" r="2" /><circle cx="34" cy="10" r="1.5" /></>),
  cut: icon(<><path d="M8 10h32v6H8z" /><path d="M12 16v22M18 16v18M24 16v22M30 16v18M36 16v22" /></>),
  nail: icon(<><path d="M16 8c8 0 14 6 14 16v16H18V24c0-6-2-10-2-16z" /><path d="M18 30h12" /></>),
  ear: icon(<><path d="M30 40c-6 0-8-6-12-8-4-3-6-6-6-12a12 12 0 0 1 24 0c0 4-4 6-4 10" /><path d="M24 20a4 4 0 0 1 4 4" /></>),
  coat: icon(<><path d="M24 40s-14-8-14-20a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 12-14 20-14 20z" /></>),
};

const SERVICES = [
  { k: "full", t: "Комплексный груминг", d: "Полный уход: купание, стрижка, когти, уши и финальный стайлинг.", p: "от 3 500 ₽" },
  { k: "bath", t: "Купание и сушка", d: "Мягкий шампунь, кондиционирующая маска и нежная пушистая сушка.", p: "от 1 800 ₽" },
  { k: "cut", t: "Стрижка и стайлинг", d: "Стрижки по стандарту породы или креативные — с ювелирной точностью.", p: "от 2 500 ₽" },
  { k: "nail", t: "Стрижка когтей", d: "Аккуратная обрезка и полировка для здоровых и удобных лапок.", p: "от 500 ₽" },
  { k: "ear", t: "Чистка ушей", d: "Гигиеничный и деликатный уход за ушами — чисто и спокойно.", p: "от 400 ₽" },
  { k: "coat", t: "Уход за лапами и шерстью", d: "Бальзам для лап, распутывание колтунов и питательные маски для шерсти.", p: "от 900 ₽" },
] as const;

const ADVANTAGES = [
  "Профессиональные грумеры", "Индивидуальный подход", "Качественная косметика",
  "Чистый и уютный салон", "Бережное обращение без стресса", "Собаки всех пород и размеров",
];

const REVIEWS = [
  { n: "Анна", dog: "Боня, французский бульдог", t: "Боня вернулась домой спокойной, мягкой и чудесно пахнущей. Команда такая бережная — теперь только к вам." },
  { n: "Михаил", dog: "Арчи, пудель", t: "Идеальная стрижка «под мишку», ровно как я просил. В каждой детали чувствуется любовь к животным." },
  { n: "Елена", dog: "Люси, мальтийская болонка", t: "Люси обычно нервничает, но здесь она чувствовала себя как дома. Красивый салон и настоящие профессионалы." },
  { n: "Дмитрий", dog: "Рокки, шпиц", t: "Быстрая запись, дружелюбный персонал и потрясающий результат. Рокки теперь как выставочная собака!" },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-script text-3xl text-glow md:text-4xl">{children}</p>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 30);
    f(); window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "border-b border-line bg-background/85 backdrop-blur-md" : ""}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <a href="#home" className="flex items-center gap-3">
          <img src={logo} alt="Логотип Лакки" width={48} height={48} className="h-12 w-12 rounded-full" />
          <span className="font-script text-3xl text-glow">Лакки</span>
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map(([l, h]) => (
            <a key={h} href={h} className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground">{l}</a>
          ))}
          <a href="#booking" className="btn-outline !py-2.5">Записаться</a>
        </nav>
        <button className="lg:hidden" aria-label="Меню" onClick={() => setOpen(!open)}>
          <div className="space-y-1.5"><span className="block h-px w-7 bg-foreground" /><span className="block h-px w-7 bg-foreground" /><span className="block h-px w-5 bg-foreground" /></div>
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-5 border-t border-line bg-background px-6 py-6 lg:hidden">
          {NAV.map(([l, h]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="text-sm uppercase tracking-[0.2em]">{l}</a>
          ))}
          <a href="#booking" onClick={() => setOpen(false)} className="btn-outline">Записаться</a>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen items-center overflow-hidden">
      <img src={heroDog} alt="Ухоженный французский бульдог" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-70 md:opacity-100" />
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
            <a href="#booking" className="btn-solid">Записаться на приём</a>
            <a href="#services" className="btn-outline">Наши услуги</a>
          </div>
        </div>
      </div>
      <a href="#services" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Листайте вниз</a>
    </section>
  );
}

function SectionTitle({ eyebrow, title, center = true }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div className={`reveal mb-14 ${center ? "text-center" : ""}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 text-4xl font-semibold md:text-6xl">{title}</h2>
      <div className={`mt-6 flex items-center gap-3 ${center ? "justify-center" : ""}`}>
        <span className="h-px w-12 bg-border" /><Paw className="h-4 w-4" /><span className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}

function Services() {
  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-28 md:px-8">
      <SectionTitle eyebrow="что мы делаем" title="Наши услуги" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, i) => (
          <article key={s.t} style={{ transitionDelay: `${i * 70}ms` }} className="reveal card-line group flex flex-col p-8 hover:-translate-y-2 hover:border-foreground hover:shadow-glow">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border transition-all duration-500 group-hover:border-foreground group-hover:shadow-glow">{ICONS[s.k]}</div>
            <h3 className="mt-6 text-3xl font-semibold">{s.t}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <span className="font-display text-xl">{s.p}</span>
              <a href="#booking" className="text-xs uppercase tracking-[0.2em] underline-offset-8 group-hover:underline">Записаться →</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="border-y border-line py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 md:px-8 lg:grid-cols-2">
        <div className="reveal relative">
          <div className="absolute -inset-4 rounded-[2rem] border border-line" />
          <img src={aboutImg} alt="Грумер расчёсывает белую мальтийскую болонку" loading="lazy" width={1008} height={1200} className="relative aspect-[4/5] w-full rounded-[1.5rem] object-cover" />
          <div className="absolute -bottom-6 -right-4 rounded-full border border-foreground bg-background px-6 py-4 shadow-glow md:-right-8">
            <span className="font-script text-2xl">с любовью</span>
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="о салоне" title="Забота, которой можно доверять" center={false} />
          <p className="reveal text-lg leading-relaxed text-muted-foreground">
            «Лакки» — бутик-салон, где каждая собака получает профессиональный, бережный и индивидуальный уход.
            Мы знакомимся с каждым гостем, подбираем косметику под его шерсть и кожу и работаем спокойно, чтобы каждый визит был комфортным.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {ADVANTAGES.map((a) => (
              <li key={a} className="reveal flex items-center gap-3 border-b border-line pb-4">
                <Paw className="h-5 w-5 shrink-0" /><span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  return (
    <section id="gallery" className="mx-auto max-w-6xl px-5 py-28 md:px-8">
      <SectionTitle eyebrow="преображения" title="До и после" />
      <div className="reveal relative aspect-[5/4] w-full select-none overflow-hidden rounded-[2rem] border border-border shadow-glow md:aspect-[16/10]">
        <img src={afterImg} alt="Собака после груминга" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <img src={beforeImg} alt="Собака до груминга" loading="lazy" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground shadow-glow" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground bg-background text-sm">⟷</div>
        </div>
        <span className="absolute left-5 top-5 rounded-full border border-foreground bg-background/70 px-4 py-1 text-xs uppercase tracking-[0.25em]">До</span>
        <span className="absolute right-5 top-5 rounded-full border border-foreground bg-background/70 px-4 py-1 text-xs uppercase tracking-[0.25em]">После</span>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Ползунок до и после" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
      <div className="mt-10 text-center"><a href="#contacts" className="btn-outline">Смотреть галерею</a></div>
    </section>
  );
}

function Why() {
  const items = [["500+", "Счастливых собак"], ["8", "Лет профессиональной заботы"], ["100%", "Премиальная косметика"], ["∞", "Любви в каждой детали"]];
  return (
    <section className="relative overflow-hidden border-y border-line py-24">
      <Paw className="absolute -right-10 -top-10 h-64 w-64 text-foreground/5" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
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

function Reviews() {
  const [i, setI] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    timer.current = window.setInterval(() => setI((x) => (x + 1) % REVIEWS.length), 6000);
    return () => clearInterval(timer.current);
  }, []);
  const r = REVIEWS[i]!;
  return (
    <section id="reviews" className="mx-auto max-w-4xl px-5 py-28 text-center md:px-8">
      <SectionTitle eyebrow="тёплые слова" title="Отзывы наших клиентов" />
      <div className="reveal card-line px-6 py-14 md:px-16">
        <div className="tracking-[0.4em] text-glow">★★★★★</div>
        <p key={i} className="mt-8 animate-in fade-in duration-700 font-display text-2xl italic leading-snug md:text-4xl">«{r.t}»</p>
        <div className="mt-8 text-sm uppercase tracking-[0.25em]">{r.n}</div>
        <div className="mt-1 font-script text-2xl text-muted-foreground">{r.dog}</div>
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button aria-label="Предыдущий отзыв" onClick={() => setI((i - 1 + REVIEWS.length) % REVIEWS.length)} className="h-11 w-11 rounded-full border border-border transition hover:border-foreground hover:shadow-glow">←</button>
        <div className="flex gap-2">
          {REVIEWS.map((_, k) => <button key={k} aria-label={`Отзыв ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-foreground" : "w-3 bg-border"}`} />)}
        </div>
        <button aria-label="Следующий отзыв" onClick={() => setI((i + 1) % REVIEWS.length)} className="h-11 w-11 rounded-full border border-border transition hover:border-foreground hover:shadow-glow">→</button>
      </div>
    </section>
  );
}

function Booking() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Спасибо! Мы скоро позвоним, чтобы подтвердить запись.");
    e.currentTarget.reset();
  };
  const L = ({ children }: { children: ReactNode }) => <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{children}</span>;
  return (
    <section id="booking" className="border-y border-line py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="reveal">
          <Eyebrow>запись на визит</Eyebrow>
          <h2 className="mt-2 text-5xl font-semibold leading-tight md:text-6xl">Ваша собака заслуживает <em className="text-glow">нового образа</em></h2>
          <p className="mt-6 max-w-sm text-muted-foreground">Оставьте заявку, и наш администратор свяжется с вами, чтобы подтвердить время.</p>
          <img src={logo} alt="" loading="lazy" className="mt-10 hidden h-48 w-48 rounded-full shadow-glow lg:block" />
        </div>
        <form onSubmit={onSubmit} className="reveal card-line grid gap-5 p-6 sm:grid-cols-2 md:p-10">
          <label><L>Имя владельца</L><input required className="field" placeholder="Анна" /></label>
          <label><L>Номер телефона</L><input required type="tel" className="field" placeholder="+7 900 000-00-00" /></label>
          <label><L>Имя собаки</L><input required className="field" placeholder="Лакки" /></label>
          <label><L>Порода</L><input className="field" placeholder="Французский бульдог" /></label>
          <label className="sm:col-span-2"><L>Услуга</L>
            <select required className="field" defaultValue="">
              <option value="" disabled className="bg-background">Выберите услугу</option>
              {SERVICES.map((s) => <option key={s.t} className="bg-background">{s.t}</option>)}
            </select>
          </label>
          <label><L>Желаемая дата</L><input required type="date" className="field [color-scheme:dark]" /></label>
          <label><L>Желаемое время</L><input required type="time" className="field [color-scheme:dark]" /></label>
          <label className="sm:col-span-2"><L>Дополнительные пожелания</L><textarea rows={3} className="field" placeholder="Что нам важно знать о вашей собаке" /></label>
          <button type="submit" className="btn-solid sm:col-span-2">Записаться на приём</button>
        </form>
      </div>
    </section>
  );
}

function Contacts() {
  const rows = [
    ["Телефон", "+7 (900) 123-45-67"], ["WhatsApp / Telegram", "@lucky_grooming"],
    ["Адрес", "ул. Примерная, 10, Москва"], ["Часы работы", "Ежедневно 10:00 – 21:00"],
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
            {["Instagram", "Telegram", "VK"].map((s) => <a key={s} href="#" className="btn-outline !px-5 !py-2 !text-[10px]">{s}</a>)}
          </div>
        </div>
        <div className="reveal relative min-h-[360px] overflow-hidden rounded-[1.5rem] border border-border">
          <iframe title="Карта расположения салона" className="absolute inset-0 h-full w-full grayscale invert-[.9] contrast-125" loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=37.58%2C55.74%2C37.66%2C55.77&layer=mapnik&marker=55.755%2C37.62" />
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
          <img src={logo} alt="Логотип Лакки" loading="lazy" className="h-28 w-28 rounded-full shadow-glow" />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {NAV.map(([l, h]) => <a key={h} href={h} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">{l}</a>)}
        </nav>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>+7 (900) 123-45-67</p><p>ул. Примерная, 10, Москва</p>
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
      <BeforeAfter />
      <Why />
      <Reviews />
      <Booking />
      <Contacts />
      <Footer />
      <Toaster />
    </main>
  );
}
