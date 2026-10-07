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
      { title: "Лакки — Lucky Grooming Salon | Professional Dog Grooming" },
      { name: "description", content: "Boutique dog grooming salon Лакки: gentle care, professional haircuts, bath & blow dry and more. Book an appointment today." },
      { property: "og:title", content: "Лакки — Lucky Grooming Salon" },
      { property: "og:description", content: "Gentle care, professional grooming, and a little extra love for every dog." },
    ],
  }),
  component: Index,
});

const NAV = [
  ["Home", "#home"], ["Services", "#services"], ["About Us", "#about"],
  ["Gallery", "#gallery"], ["Reviews", "#reviews"], ["Contacts", "#contacts"],
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
  { k: "full", t: "Full Grooming", d: "Complete care: bath, haircut, nails, ears and finishing styling.", p: "from 3 500 ₽" },
  { k: "bath", t: "Bath & Blow Dry", d: "Gentle shampoo, conditioning mask and a soft, fluffy blow dry.", p: "from 1 800 ₽" },
  { k: "cut", t: "Haircut & Styling", d: "Breed-standard or creative cuts, shaped with precision.", p: "from 2 500 ₽" },
  { k: "nail", t: "Nail Trimming", d: "Careful clipping and filing for comfortable, healthy paws.", p: "from 500 ₽" },
  { k: "ear", t: "Ear Cleaning", d: "Hygienic, delicate ear care to keep them clean and calm.", p: "from 400 ₽" },
  { k: "coat", t: "Paw & Coat Care", d: "Paw balm, detangling and nourishing coat treatments.", p: "from 900 ₽" },
] as const;

const ADVANTAGES = [
  "Professional groomers", "Individual approach", "High-quality grooming products",
  "Clean and comfortable salon", "Stress-conscious handling", "Dogs of all breeds and sizes",
];

const REVIEWS = [
  { n: "Anna", dog: "Bonya, French Bulldog", t: "Bonya came home calm, soft and smelling wonderful. The team is so gentle — we won't go anywhere else." },
  { n: "Mikhail", dog: "Archie, Poodle", t: "A perfect teddy cut, exactly as I asked. You can feel the love for animals in every detail." },
  { n: "Elena", dog: "Lucy, Maltese", t: "Lucy is usually nervous, but here she felt at home. Beautiful salon and real professionals." },
  { n: "Dmitry", dog: "Rocky, Spitz", t: "Fast booking, friendly staff and an amazing result. Rocky looks like a show dog now!" },
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
          <img src={logo} alt="Лакки logo" width={48} height={48} className="h-12 w-12 rounded-full" />
          <span className="font-script text-3xl text-glow">Лакки</span>
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map(([l, h]) => (
            <a key={h} href={h} className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground">{l}</a>
          ))}
          <a href="#booking" className="btn-outline !py-2.5">Book Now</a>
        </nav>
        <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
          <div className="space-y-1.5"><span className="block h-px w-7 bg-foreground" /><span className="block h-px w-7 bg-foreground" /><span className="block h-px w-5 bg-foreground" /></div>
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-5 border-t border-line bg-background px-6 py-6 lg:hidden">
          {NAV.map(([l, h]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="text-sm uppercase tracking-[0.2em]">{l}</a>
          ))}
          <a href="#booking" onClick={() => setOpen(false)} className="btn-outline">Book Now</a>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen items-center overflow-hidden">
      <img src={heroDog} alt="Well-groomed French Bulldog" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-70 md:opacity-100" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      <div className="spin-slow pointer-events-none absolute -left-40 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full border border-line" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full border border-dashed border-line" />
      <Paw className="floaty absolute right-[8%] top-[18%] h-10 w-10 text-foreground/25 [--r:20deg]" />
      <Paw className="floaty absolute bottom-[16%] left-[46%] h-7 w-7 text-foreground/20 [--r:-15deg] [animation-delay:2s]" />
      <div className="relative mx-auto w-full max-w-7xl px-5 pt-24 md:px-8">
        <div className="max-w-2xl reveal">
          <Eyebrow>Lucky Grooming Salon</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-8xl">
            Professional Grooming for Your <em className="text-glow">Best Friend</em>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Gentle care, professional grooming, and a little extra love for every dog.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#booking" className="btn-solid">Book an Appointment</a>
            <a href="#services" className="btn-outline">View Services</a>
          </div>
        </div>
      </div>
      <a href="#services" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Scroll</a>
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
      <SectionTitle eyebrow="what we do" title="Our Grooming Services" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, i) => (
          <article key={s.t} style={{ transitionDelay: `${i * 70}ms` }} className="reveal card-line group flex flex-col p-8 hover:-translate-y-2 hover:border-foreground hover:shadow-glow">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border transition-all duration-500 group-hover:border-foreground group-hover:shadow-glow">{ICONS[s.k]}</div>
            <h3 className="mt-6 text-3xl font-semibold">{s.t}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <span className="font-display text-xl">{s.p}</span>
              <a href="#booking" className="text-xs uppercase tracking-[0.2em] underline-offset-8 group-hover:underline">Book Now →</a>
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
          <img src={aboutImg} alt="Groomer brushing a white Maltese" loading="lazy" width={1008} height={1200} className="relative aspect-[4/5] w-full rounded-[1.5rem] object-cover" />
          <div className="absolute -bottom-6 -right-4 rounded-full border border-foreground bg-background px-6 py-4 shadow-glow md:-right-8">
            <span className="font-script text-2xl">with love</span>
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="about the salon" title="Care You Can Trust" center={false} />
          <p className="reveal text-lg leading-relaxed text-muted-foreground">
            Lucky Grooming Salon is a boutique space where every dog receives professional, gentle and individual care.
            We take time to get to know each guest, choose products for their coat and skin, and work calmly so every visit feels safe.
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
      <SectionTitle eyebrow="transformations" title="Before & After" />
      <div className="reveal relative aspect-[5/4] w-full select-none overflow-hidden rounded-[2rem] border border-border shadow-glow md:aspect-[16/10]">
        <img src={afterImg} alt="Dog after grooming" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <img src={beforeImg} alt="Dog before grooming" loading="lazy" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground shadow-glow" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground bg-background text-sm">⟷</div>
        </div>
        <span className="absolute left-5 top-5 rounded-full border border-foreground bg-background/70 px-4 py-1 text-xs uppercase tracking-[0.25em]">Before</span>
        <span className="absolute right-5 top-5 rounded-full border border-foreground bg-background/70 px-4 py-1 text-xs uppercase tracking-[0.25em]">After</span>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Before and after slider" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
      <div className="mt-10 text-center"><a href="#contacts" className="btn-outline">View Gallery</a></div>
    </section>
  );
}

function Why() {
  const items = [["500+", "Happy Dogs"], ["8", "Years of Professional Care"], ["100%", "Premium Products"], ["∞", "Love in Every Detail"]];
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
  const timer = useRef<number>();
  useEffect(() => {
    timer.current = window.setInterval(() => setI((x) => (x + 1) % REVIEWS.length), 6000);
    return () => clearInterval(timer.current);
  }, []);
  const r = REVIEWS[i];
  return (
    <section id="reviews" className="mx-auto max-w-4xl px-5 py-28 text-center md:px-8">
      <SectionTitle eyebrow="kind words" title="What Our Clients Say" />
      <div className="reveal card-line px-6 py-14 md:px-16">
        <div className="tracking-[0.4em] text-glow">★★★★★</div>
        <p key={i} className="mt-8 animate-in fade-in duration-700 font-display text-2xl italic leading-snug md:text-4xl">“{r.t}”</p>
        <div className="mt-8 text-sm uppercase tracking-[0.25em]">{r.n}</div>
        <div className="mt-1 font-script text-2xl text-muted-foreground">{r.dog}</div>
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button aria-label="Previous review" onClick={() => setI((i - 1 + REVIEWS.length) % REVIEWS.length)} className="h-11 w-11 rounded-full border border-border transition hover:border-foreground hover:shadow-glow">←</button>
        <div className="flex gap-2">
          {REVIEWS.map((_, k) => <button key={k} aria-label={`Review ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-foreground" : "w-3 bg-border"}`} />)}
        </div>
        <button aria-label="Next review" onClick={() => setI((i + 1) % REVIEWS.length)} className="h-11 w-11 rounded-full border border-border transition hover:border-foreground hover:shadow-glow">→</button>
      </div>
    </section>
  );
}

function Booking() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Thank you! We'll call you shortly to confirm your appointment.");
    e.currentTarget.reset();
  };
  const L = ({ children }: { children: ReactNode }) => <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{children}</span>;
  return (
    <section id="booking" className="border-y border-line py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="reveal">
          <Eyebrow>book a visit</Eyebrow>
          <h2 className="mt-2 text-5xl font-semibold leading-tight md:text-6xl">Your Dog Deserves a <em className="text-glow">Fresh New Look</em></h2>
          <p className="mt-6 max-w-sm text-muted-foreground">Leave a request and our administrator will contact you to confirm the time.</p>
          <img src={logo} alt="" loading="lazy" className="mt-10 hidden h-48 w-48 rounded-full shadow-glow lg:block" />
        </div>
        <form onSubmit={onSubmit} className="reveal card-line grid gap-5 p-6 sm:grid-cols-2 md:p-10">
          <label><L>Owner's name</L><input required className="field" placeholder="Anna" /></label>
          <label><L>Phone number</L><input required type="tel" className="field" placeholder="+7 900 000-00-00" /></label>
          <label><L>Dog's name</L><input required className="field" placeholder="Lucky" /></label>
          <label><L>Breed</L><input className="field" placeholder="French Bulldog" /></label>
          <label className="sm:col-span-2"><L>Service</L>
            <select required className="field" defaultValue="">
              <option value="" disabled className="bg-background">Choose a service</option>
              {SERVICES.map((s) => <option key={s.t} className="bg-background">{s.t}</option>)}
            </select>
          </label>
          <label><L>Preferred date</L><input required type="date" className="field [color-scheme:dark]" /></label>
          <label><L>Preferred time</L><input required type="time" className="field [color-scheme:dark]" /></label>
          <label className="sm:col-span-2"><L>Additional notes</L><textarea rows={3} className="field" placeholder="Anything we should know about your dog" /></label>
          <button type="submit" className="btn-solid sm:col-span-2">Book an Appointment</button>
        </form>
      </div>
    </section>
  );
}

function Contacts() {
  const rows = [
    ["Phone", "+7 (900) 123-45-67"], ["WhatsApp / Telegram", "@lucky_grooming"],
    ["Address", "ul. Primernaya 10, Moscow"], ["Opening hours", "Daily 10:00 – 21:00"],
  ];
  return (
    <section id="contacts" className="mx-auto max-w-7xl px-5 py-28 md:px-8">
      <SectionTitle eyebrow="find us" title="Contacts" />
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
          <iframe title="Salon location map" className="absolute inset-0 h-full w-full grayscale invert-[.9] contrast-125" loading="lazy"
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
          <img src={logo} alt="Лакки logo" loading="lazy" className="h-28 w-28 rounded-full shadow-glow" />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {NAV.map(([l, h]) => <a key={h} href={h} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">{l}</a>)}
        </nav>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>+7 (900) 123-45-67</p><p>ul. Primernaya 10, Moscow</p>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} Лакки · Lucky Grooming Salon</p>
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
