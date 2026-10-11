"use client";

import Image from "next/image";
import localFont from "next/font/local";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlowingMenu, type FlowingMenuItem } from "./FlowingMenu";
import styles from "./ServicesWindow.module.css";

const lemonMilk = localFont({
  src: [
    { path: "../../../assets/fonts/lemon-milk-regular.otf", weight: "400", style: "normal" },
    { path: "../../../assets/fonts/lemon-milk-bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-services-lemon-milk",
  display: "swap",
});

type ServiceId =
  | "music-production"
  | "mix-master"
  | "composition"
  | "music-video-direction"
  | "creative-direction"
  | "artist-development";

interface Service extends FlowingMenuItem {
  id: ServiceId;
  copy: string;
  deliverables: readonly string[];
  accent: string;
  selective?: boolean;
}

const SERVICES: readonly Service[] = [
  {
    id: "music-production",
    number: "01",
    text: "Music Production",
    tags: ["Beat Production", "Arrangement", "Sound Design", "Vocal Production"],
    copy: "Original production built around the artist rather than forcing the artist into a template.",
    deliverables: ["Production sessions", "Arrangement map", "Vocal direction", "Track-ready stems"],
    image: "/images/track-cards/bhala-kyun.jpg",
    accent: "Sound first. Template never.",
  },
  {
    id: "mix-master",
    number: "02",
    text: "Mix + Master",
    tags: ["Vocal Mixing", "Full Mix", "Mastering", "Stems"],
    copy: "Clean, impactful mixes designed to preserve character while translating across headphones, cars, clubs and streaming platforms.",
    deliverables: ["Full mix", "Instrumental", "Performance master", "Streaming master"],
    image: "/images/track-cards/dnd-trip.jpg",
    accent: "Character intact. Impact everywhere.",
  },
  {
    id: "composition",
    number: "03",
    text: "Composition",
    tags: ["Song Writing/Composing", "Hooks", "Jingles", "Brand Audio", "Custom Tracks"],
    copy: "Custom compositions developed around a brief, emotion, campaign or visual identity.",
    deliverables: ["Creative direction", "Original composition", "Alternate cuts", "Usage-ready exports"],
    image: "/images/covers/finding-peace.jpg",
    accent: "A feeling, translated into sound.",
  },
  {
    id: "music-video-direction",
    number: "04",
    text: "Music Video Direction",
    tags: ["Concept", "Treatment", "Shot Design", "Direction"],
    copy: "Narrative and performance-led music videos developed from the song outward — concept, visual language and execution.",
    deliverables: ["Concept deck", "Visual treatment", "Shot language", "On-set direction"],
    image: "/images/dotm/portfolio-bg-blue-coat.jpg",
    accent: "The song decides the world.",
  },
  {
    id: "creative-direction",
    number: "05",
    text: "Creative Direction",
    tags: ["Identity", "Campaigns", "Rollouts", "Visual Systems"],
    copy: "Building the world around a project — not just individual assets. Visual identity, campaign language, rollout ideas and creative continuity.",
    deliverables: ["Creative territory", "Campaign system", "Rollout plan", "Continuity direction"],
    image: "/images/dotm/contact-photo.jpg",
    accent: "One world. Every touchpoint.",
  },
  {
    id: "artist-development",
    number: "06",
    text: "Artist Development",
    tags: ["Sound", "Positioning", "Project Direction", "World Building"],
    copy: "Helping emerging artists define what they sound like, what they represent and how those ideas translate into releases.",
    deliverables: ["Sound audit", "Positioning", "Project direction", "Release-world roadmap"],
    image: "/images/dotm/den-portrait.jpg",
    accent: "Define the artist. Then build the era.",
    selective: true,
  },
] as const;

const SERVICE_OPTIONS = [
  "Production",
  "Mix + Master",
  "Composition",
  "Video Direction",
  "Creative Direction",
  "Other",
] as const;

const BUDGETS = ["Under ₹50k", "₹50k – ₹1L", "₹1L – ₹3L", "₹3L – ₹10L", "₹10L+", "Prefer to discuss"];

export function ServicesWindow({ persona }: { persona: "dev" | "dotm" }) {
  const scrollRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<ServiceId | null>(null);
  const active = useMemo(() => SERVICES.find((service) => service.id === activeId) ?? null, [activeId]);

  const navigate = (id: ServiceId | null) => {
    setActiveId(id);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const startProject = () => {
    setActiveId(null);
    window.setTimeout(() => {
      document.getElementById("inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <main ref={scrollRef} data-services-persona={persona} className={`${styles.root} ${lemonMilk.variable} h-full w-full max-w-full overflow-x-hidden overflow-y-auto bg-[#D22B2B] text-black selection:bg-black selection:text-[#D22B2B]`}>
      <AnimatePresence mode="wait" initial={false}>
        {active ? (
          <ServiceDetail key={active.id} service={active} onBack={() => navigate(null)} onStart={startProject} />
        ) : (
          <motion.div key="services-home" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ServicesLanding onSelect={(id) => navigate(id as ServiceId)} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ServicesLanding({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <>
      <style jsx global>{`
        @keyframes services-marquee { to { transform: translateX(-33.333%); } }
        .services-display { font-family: "Arial Black", "Helvetica Neue", Arial, sans-serif; font-weight: 900; }
        .services-section-title {
          font-size: clamp(1.75rem, 7.7vw, 7.5rem);
          line-height: 0.82;
          letter-spacing: -0.065em;
        }
      `}</style>
      <section className="relative flex h-full min-h-[30rem] flex-col overflow-hidden border-b-4 border-black px-5 py-5 md:px-10 md:py-7">
        <header className="relative z-10 flex shrink-0 items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] md:text-xs">
          <span className={styles.cornerText}>DOTM DAILY®</span>
          <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black p-1 text-white shadow-[0_6px_18px_rgba(0,0,0,0.2)]" aria-label="Services sections">
            <a href="#service-list" className="rounded-full px-3 py-2 transition hover:bg-white hover:text-black md:px-5">Services</a>
            <a href="#process" className="rounded-full px-3 py-2 transition hover:bg-white hover:text-black md:px-5">Process</a>
            <a href="#inquiry" className="rounded-full px-3 py-2 transition hover:bg-white hover:text-black md:px-5">Contact</a>
          </nav>
          <span className={`${styles.cornerText} hidden md:block`}>Independent / Creative</span>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2 md:py-4">
          <Image
            src="/images/dotm/dotm-daily-logo-hq.png"
            alt="DOTM DAILY"
            width={1254}
            height={1254}
            unoptimized
            priority
            className="pointer-events-none h-full max-h-[52rem] w-[min(92vw,52rem)] scale-[1.08] select-none object-contain md:scale-[1.15]"
            draggable={false}
          />
        </div>

        <div className="relative z-10 grid shrink-0 items-end gap-5 md:grid-cols-[1fr_auto_1fr]">
          <div className={`${styles.cornerText} font-mono text-[10px] uppercase leading-5 tracking-[0.12em]`}>
            <p>Music / Visuals / Direction / Development</p>
            <p>Based in New Delhi</p>
          </div>
          <RotatingExplore />
          <span className={`${styles.cornerText} hidden justify-self-end font-mono text-[10px] uppercase tracking-[0.12em] md:block`}>Scroll to explore</span>
        </div>
      </section>

      <section className="-rotate-[0.7deg] overflow-hidden border-y-4 border-black bg-black py-4 text-white">
        <MarqueeLine className="text-[#D22B2B]">PRODUCE • COMPOSE • MIX • MASTER • DIRECT • CREATE •</MarqueeLine>
        <MarqueeLine reverse>SOUND → IDENTITY → VISUALS → RELEASE →</MarqueeLine>
      </section>

      <section id="service-list" className="scroll-mt-2 border-b-4 border-black bg-black">
        <div className="flex items-end justify-between px-5 py-8 text-white md:px-12 md:py-12">
          <h1 className="services-display services-section-title">SERVICES</h1>
          <span className="hidden pb-1 font-mono text-xs uppercase tracking-[0.18em] md:block">Hover / Select / Build</span>
        </div>
        <FlowingMenu items={SERVICES} onSelect={onSelect} />
      </section>

      <section id="process" className="scroll-mt-2 bg-white px-5 py-16 md:px-12 md:py-24">
        <h2 className="services-display services-section-title whitespace-nowrap uppercase">How we build.</h2>
        <div className="mt-12 grid md:grid-cols-4">
          {[
            ["01 / BRIEF", "Tell us what you're building."],
            ["02 / DIRECTION", "We define the sound, concept or visual language."],
            ["03 / EXECUTION", "Production, composition, direction or creative development."],
            ["04 / DELIVERY", "Final files, masters, concepts or campaign assets."],
          ].map(([title, copy]) => (
            <article key={title} className="flex min-h-52 flex-col justify-between border-2 border-b-0 border-black p-5 last:border-b-2 md:border-r-0 md:border-b-2 md:last:border-r-2">
              <b className="font-mono text-sm">{title}</b>
              <p className="font-mono text-sm leading-6">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <InquirySection />
    </>
  );
}

function ServiceDetail({ service, onBack, onStart }: { service: Service; onBack: () => void; onStart: () => void }) {
  return (
    <motion.article className={styles.detail} initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -35 }} transition={{ duration: 0.28 }}>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-black bg-[#D22B2B] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] md:px-8">
        <button type="button" onClick={onBack} className="border border-black bg-black px-4 py-2 text-white transition hover:bg-white hover:text-black">← Back to Services</button>
        <span>{service.number} / {String(SERVICES.length).padStart(2, "0")}</span>
      </header>
      <section className={`${styles.detailHero} grid min-h-[75vh] border-b-4 border-black lg:grid-cols-[1.25fr_0.75fr]`}>
        <div className="flex flex-col justify-between p-5 md:p-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]">DOTM DAILY / Service {service.number}</p>
            {service.selective && <p className="mt-5 inline-block border-2 border-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Select projects only</p>}
          </div>
          <h1 className="my-16 max-w-[12ch] text-[18vw] font-black uppercase leading-[0.78] tracking-[-0.08em] lg:text-[9vw]">{service.text}</h1>
          <p className="max-w-2xl font-mono text-sm leading-7 md:text-lg">{service.copy}</p>
        </div>
        <div className="relative min-h-[24rem] overflow-hidden border-t-4 border-black lg:min-h-0 lg:border-t-0 lg:border-l-4">
          <div className="absolute inset-0 scale-105 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${service.image})` }} />
          <div className="absolute inset-0 bg-[#D22B2B]/20 mix-blend-multiply" />
          <p className={`${styles.imageAccent} absolute inset-x-5 bottom-5 text-5xl font-black uppercase leading-[0.85] tracking-[-0.07em] text-white mix-blend-difference md:text-7xl`}>{service.accent}</p>
        </div>
      </section>
      <section className="grid bg-black text-white md:grid-cols-[0.75fr_1.25fr]">
        <div className="border-b border-white/30 p-6 md:border-r md:border-b-0 md:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#D22B2B]">Scope</p>
          <h2 className="mt-5 text-5xl font-black uppercase leading-[0.85] tracking-[-0.06em] md:text-7xl">Built around<br />the brief.</h2>
        </div>
        <div>
          {service.deliverables.map((item, index) => (
            <div key={item} className="grid grid-cols-[3rem_1fr] border-b border-white/30 px-6 py-7 last:border-b-0 md:px-10">
              <span className="font-mono text-xs text-[#D22B2B]">0{index + 1}</span>
              <strong className="text-2xl font-black uppercase tracking-[-0.04em] md:text-4xl">{item}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col items-start justify-between gap-8 border-t-4 border-black bg-white px-5 py-14 md:flex-row md:items-end md:px-10 md:py-20">
        <h2 className="text-[16vw] font-black uppercase leading-[0.78] tracking-[-0.075em] md:text-[8vw]">Make it<br />real.</h2>
        <button type="button" onClick={onStart} className="border-2 border-black bg-black px-6 py-4 font-mono text-xs uppercase tracking-[0.16em] text-white hover:bg-[#A91F1F] hover:text-white">Start a project ↗</button>
      </section>
    </motion.article>
  );
}

function InquirySection() {
  const timelineRef = useRef<HTMLInputElement>(null);
  const [service, setService] = useState<(typeof SERVICE_OPTIONS)[number]>("Production");
  const [values, setValues] = useState({ name: "", contact: "", budget: "", brief: "", timeline: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reference, setReference] = useState("");
  const email = values.contact.includes("@") ? values.contact.trim() : "";
  const phone = email ? "" : values.contact.replace(/\D/g, "").slice(0, 15);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiry_type: "other",
          source: "services-inquiry",
          event_type: service,
          budget_range: values.budget,
          contact_name: values.name,
          contact_email: email,
          contact_phone: phone,
          message: `SERVICE REQUIRED: ${service}\nTIMELINE: ${values.timeline || "Not specified"}\n\nPROJECT BRIEF:\n${values.brief}`,
        }),
      });
      const data = (await response.json()) as { ok: boolean; id?: string };
      if (!response.ok || !data.ok) throw new Error("submit failed");
      setReference(data.id ?? "");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="inquiry" className="scroll-mt-2 bg-[#D22B2B] px-5 py-16 md:px-12 md:py-24">
      <h2 className="services-display services-section-title uppercase">Have a project?<br />Let&apos;s build it.</h2>
      {status === "sent" ? (
        <div className="mt-12 border-4 border-black bg-black p-8 text-white md:p-12" role="status">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#D22B2B]">Request received</p>
          <p className="mt-5 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">It&apos;s in the admin inbox.</p>
          <p className="mt-5 font-mono text-xs text-white/60">REF {reference}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-12 grid gap-x-8 gap-y-6 border-t-4 border-black pt-8 md:grid-cols-2">
          <ServiceField label="Name"><input required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /></ServiceField>
          <ServiceField label="Email / Phone"><input required value={values.contact} onChange={(e) => setValues({ ...values, contact: e.target.value })} /></ServiceField>
          <fieldset className="md:col-span-2">
            <legend className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Service required</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((option) => (
                <button key={option} type="button" onClick={() => setService(option)} className={`border-2 border-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition ${service === option ? "bg-black text-white" : "hover:bg-white"}`}>{option}</button>
              ))}
            </div>
          </fieldset>
          <ServiceField label="Budget range"><select required value={values.budget} onChange={(e) => setValues({ ...values, budget: e.target.value })}><option value="">Select a range</option>{BUDGETS.map((budget) => <option key={budget}>{budget}</option>)}</select></ServiceField>
          <ServiceField label="Timeline">
            <span className="relative block">
              <input
                ref={timelineRef}
                required
                type="date"
                value={values.timeline}
                onClick={() => timelineRef.current?.showPicker?.()}
                onChange={(e) => setValues({ ...values, timeline: e.target.value })}
                className="[&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-black stroke-2">
                <rect x="3" y="5" width="18" height="16" rx="1" />
                <path d="M7 3v4M17 3v4M3 10h18" />
              </svg>
            </span>
          </ServiceField>
          <ServiceField label="Project brief" wide><textarea required rows={5} value={values.brief} onChange={(e) => setValues({ ...values, brief: e.target.value })} /></ServiceField>
          {status === "error" && <p className="font-mono text-xs font-bold md:col-span-2" role="alert">Could not send the request. Check the contact details and try again.</p>}
          <button disabled={status === "sending"} type="submit" className="border-2 border-black bg-black px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-black disabled:opacity-50 md:col-span-2">{status === "sending" ? "Sending…" : "Start a project ↗"}</button>
        </form>
      )}
    </section>
  );
}

function ServiceField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className={wide ? "md:col-span-2" : undefined}>
      <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
      <span className="[&_input]:w-full [&_input]:border-2 [&_input]:border-black [&_input]:bg-transparent [&_input]:px-4 [&_input]:py-3 [&_input]:pr-10 [&_input]:font-mono [&_input]:outline-none [&_input]:focus:bg-white [&_select]:w-full [&_select]:border-2 [&_select]:border-black [&_select]:bg-[#D22B2B] [&_select]:px-4 [&_select]:py-3 [&_select]:font-mono [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:border-2 [&_textarea]:border-black [&_textarea]:bg-transparent [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:font-mono [&_textarea]:outline-none [&_textarea]:focus:bg-white">{children}</span>
    </label>
  );
}

function MarqueeLine({ children, reverse = false, className = "" }: { children: string; reverse?: boolean; className?: string }) {
  return <div className={`${styles.conveyorText} flex w-max whitespace-nowrap text-3xl font-black uppercase tracking-[-0.035em] md:text-6xl ${className}`} style={{ animation: `services-marquee ${reverse ? 28 : 22}s linear infinite ${reverse ? "reverse" : "normal"}` }}>{children}&nbsp;{children}&nbsp;{children}</div>;
}

function RotatingExplore() {
  return (
    <div className="relative hidden h-24 w-24 place-items-center rounded-full bg-black text-white md:grid" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-[spin_14s_linear_infinite]">
        <defs><path id="services-circle" d="M 50,50 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0" /></defs>
        <text className="fill-white font-mono text-[8px] font-bold tracking-[1.5px]"><textPath href="#services-circle">EXPLORE SERVICES • EXPLORE SERVICES • </textPath></text>
      </svg>
      <span className="text-2xl">↓</span>
    </div>
  );
}
