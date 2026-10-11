"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import localFont from "next/font/local";
import { gsap } from "gsap";
import { ArrowLeft, ArrowUpRight, Film, MapPin } from "lucide-react";
import { shootSiteProperties, shootSiteTracks, type ShootSiteTrack } from "@/content/shoot-at-site";
import { trackArtwork, trackById } from "@/content/tracks";
import { SiteVideo } from "./SiteVideo";
import styles from "./ShootOnSightWindow.module.css";

const editorial = localFont({
  src: [
    { path: "../../../assets/fonts/playfair-display-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../../../assets/fonts/playfair-display-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-shoot-editorial",
  display: "swap",
});

function artworkFor(track: ShootSiteTrack) {
  if (track.artwork) return track.artwork;
  const catalogueTrack = trackById(track.id);
  if (!catalogueTrack) return "";
  const artwork = trackArtwork(catalogueTrack);
  return typeof artwork === "string" ? artwork : artwork.src;
}

export function ShootOnSightWindow({ isDotm }: { isDotm: boolean }) {
  const [trackId, setTrackId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnCard = useRef<string | null>(null);
  const track = shootSiteTracks.find((item) => item.id === trackId);
  const properties = shootSiteProperties.filter((item) => track?.propertyIds.includes(item.id));
  const property = properties.find((item) => item.id === propertyId);

  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    if (trackId) heading.current?.focus({ preventScroll: true });
    else if (returnCard.current) {
      scroller.current?.querySelector<HTMLButtonElement>(`[data-track-id="${returnCard.current}"]`)?.focus({ preventScroll: true });
      returnCard.current = null;
    }
  }, [trackId, propertyId]);

  function openTrack(id: string) {
    returnCard.current = id;
    setPropertyId(null);
    setTrackId(id);
  }

  function allTracks() {
    setPropertyId(null);
    setTrackId(null);
  }

  return (
    <div ref={scroller} className={`${styles.root} ${editorial.variable}`} data-theme={isDotm ? "dotm" : "dev"}>
      <header className={styles.navbar}>
        <button className={styles.logo} onClick={allTracks} aria-label="Shoot at Site — all tracks">Shoot at Site</button>
        <nav aria-label="Shoot at Site navigation" className={styles.navLinks}>
          <button onClick={allTracks}>Tracks</button>
          <span aria-hidden="true">/</span>
          <span>{track ? "Shoot story" : "Locations & stories"}</span>
        </nav>
        <span className={styles.persona}>{isDotm ? "DOTM" : "DEV"} / 07 TRACKS</span>
      </header>

      {!track ? (
        <main className={styles.parent}>
          <div className={styles.status}><span aria-hidden="true" /> SHOOT ARCHIVE <b>Music / places / process</b></div>
          <TrackConstellation onSelect={openTrack} />
          <section className={styles.intro}>
            <p className={styles.eyebrow}>BEHIND THE MUSIC VIDEO</p>
            <h1>Every track.<br /><em>A place. A story.</em></h1>
            <p>Explore where we shot and how we made it.</p>
            <div className={styles.ctas}>
              <button className={styles.solidButton} onClick={() => openTrack(shootSiteTracks[0].id)}>Explore the shoots <ArrowUpRight size={16} /></button>
              <span className={styles.hint}>Hover to focus · Select a track to enter</span>
            </div>
          </section>
          <footer className={styles.footer}><span>SHOOT AT SITE</span><span>07 TRACKS / LOCATION DETAILS PENDING</span></footer>
        </main>
      ) : (
        <main className={styles.child}>
          <div className={styles.breadcrumbs}>
            <button className={styles.backButton} onClick={allTracks}><ArrowLeft size={15} /> All tracks</button>
            {property && <button className={styles.backButton} onClick={() => setPropertyId(null)}><ArrowLeft size={15} /> {track.title} locations</button>}
          </div>
          <header className={styles.childHeader}>
            <p className={styles.eyebrow}>{property ? "THE LOCATION / THE STORY" : "THE TRACK / THE LOCATIONS"}</p>
            <h1 ref={heading} tabIndex={-1}>{property?.name ?? track.title}</h1>
            <p>{property ? [property.city, property.date].filter(Boolean).join(" · ") || track.title : "The places and process behind the music video."}</p>
          </header>
          <div className={styles.storyLayout}>
            <div className={styles.storyContent}>
              {!property ? (
                <section className={styles.panel}>
                  <div className={styles.sectionTitle}><MapPin size={18} /><h2>Shoot locations</h2><span>{properties.length ? String(properties.length).padStart(2, "0") : "PENDING"}</span></div>
                  {properties.length ? (
                    <div className={styles.propertyGrid}>{properties.map((item) => (
                      <button key={item.id} className={styles.propertyCard} onClick={() => setPropertyId(item.id)}>
                        <span>{item.name}</span><small>{item.city ?? "City pending"}</small><ArrowUpRight size={18} />
                      </button>
                    ))}</div>
                  ) : <p className={styles.pending}>Property names and location details are pending. They’ll appear here when supplied.</p>}
                </section>
              ) : (
                <>
                  <section className={styles.panel}><div className={styles.sectionTitle}><Film size={18} /><h2>How we shot it</h2></div><p className={property.story ? styles.storyText : styles.pending}>{property.story ?? "Shoot story pending."}</p></section>
                  <section className={styles.panel}>
                    <div className={styles.sectionTitle}><h2>From the shoot</h2><span>WEBSITE EXCLUSIVE</span></div>
                    {property.media.length ? <div className={styles.mediaGrid}>{property.media.map((media) => (
                      <figure key={media.id}>
                        {media.kind === "video" ? <SiteVideo src={media.src} aria-label={media.alt} autoPlay muted loop playsInline preload="metadata" /> : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media.src} alt={media.alt} loading="lazy" decoding="async" />
                        )}
                        {media.credit && <figcaption>{media.credit}</figcaption>}
                      </figure>
                    ))}</div> : <p className={styles.pending}>Exclusive photos and clips will be added here. Publicly viewable on this website.</p>}
                  </section>
                  {property.publicLinks.length > 0 && <section className={styles.panel}><div className={styles.sectionTitle}><h2>Publicly released media</h2></div><div className={styles.publicLinks}>{property.publicLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={16} /></a>)}</div></section>}
                </>
              )}
              <section className={styles.panel}>
                <div className={styles.sectionTitle}><Film size={18} /><h2>Official music video</h2></div>
                {track.musicVideoUrl ? <a className={styles.solidButton} href={track.musicVideoUrl} target="_blank" rel="noopener noreferrer">Watch on YouTube <ArrowUpRight size={16} /></a> : <p className={styles.pending}>YouTube music-video link pending.</p>}
              </section>
              {!property && <section className={styles.panel}><div className={styles.sectionTitle}><h2>Exclusive shoot media</h2><span>COMING LATER</span></div><p className={styles.pending}>Photos and behind-the-scenes clips will live on each property’s page, publicly viewable here.</p></section>}
            </div>
            <MarkLoop />
          </div>
        </main>
      )}
    </div>
  );
}

function TrackConstellation({ onSelect }: { onSelect: (id: string) => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let frame = 0;
    function measure() {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll<HTMLElement>("[data-track-id]")];
      const centres = cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { x: box.left - rect.left + box.width / 2, y: box.top - rect.top + box.height / 2 };
      });
      const centre = centres[0];
      if (!centre) return;
      setPaths(centres.slice(1).map((point) => `M ${centre.x} ${centre.y} C ${centre.x} ${point.y}, ${point.x} ${centre.y}, ${point.x} ${point.y}`));
    }
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); });
    observer.observe(element);
    element.querySelectorAll<HTMLElement>("[data-track-id]").forEach((card) => observer.observe(card));
    frame = requestAnimationFrame(measure);
    const animation = gsap.matchMedia();
    animation.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(element.querySelectorAll("[data-track-id]"), { opacity: 0 }, { opacity: 1, duration: 1.1, stagger: 0.07, ease: "power4.out", clearProps: "opacity" });
    });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); animation.revert(); };
  }, []);

  return (
    <div ref={canvas} className={styles.constellation} aria-label="Seven music-video shoot stories">
      <svg className={styles.connections} width="100%" height="100%" aria-hidden="true">
        <defs><linearGradient id={gradientId}><stop stopColor="#c9b8a0" stopOpacity=".9" /><stop offset="1" stopColor="#a78b71" stopOpacity=".1" /></linearGradient></defs>
        {paths.map((path, index) => <g key={index}><path d={path} className={styles.nodeLine} stroke={`url(#${gradientId})`} /><path d={path} className={styles.flowLine} /></g>)}
      </svg>
      {shootSiteTracks.map((track, index) => (
        <button key={track.id} data-track-id={track.id} data-node={index} className={styles.trackCard} onClick={() => onSelect(track.id)} aria-label={`Explore ${track.title} shoot locations and story`}>
          {/* Existing release artwork is a preview until actual shoot media arrives. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.artwork} src={artworkFor(track)} alt="" decoding="async" draggable={false} />
          <span className={styles.cardShade} aria-hidden="true" />
          <span className={styles.cardIndex}>0{index + 1} / MUSIC VIDEO</span>
          <span className={styles.cardCaption}><span className={styles.cardSymbol}><Film size={16} /></span><span><strong>{track.title}</strong><small>EXPLORE THE SHOOT</small></span><ArrowUpRight className={styles.cardArrow} size={18} /></span>
        </button>
      ))}
    </div>
  );
}

function MarkLoop() {
  const [failed, setFailed] = useState(false);
  return (
    <aside className={styles.markPanel}>
      <SiteVideo src="/videos/shoot-on-sight/dotm-was-here.mp4" aria-label="DOTM was here" autoPlay loop muted playsInline preload="metadata" onError={() => setFailed(true)} />
      <div className={styles.markCaption}><span className={styles.eyebrow}>ON LOCATION</span><p>DOTM was here.</p>{failed && <small>Clip unavailable.</small>}</div>
    </aside>
  );
}
