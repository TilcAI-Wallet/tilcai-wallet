"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Timeline } from "./timeline";
import styles from "./scroll-story.module.css";

type Slide = { label: string; content: ReactNode };

type StoryProps = {
  id: string;
  title: string;
  note: string;
  className: string;
  slides: readonly Slide[];
  backdrop?: (slide: number) => ReactNode;
  children?: ReactNode;
};

const motionQuery = "(prefers-reduced-motion: no-preference) and (min-height: 700px)";

export function ScrollStory({ id, title, note, className, slides, backdrop, children }: StoryProps) {
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const section = track.current;
    const marker = rail.current?.firstElementChild;
    if (!section || !marker) return;

    const motion = window.matchMedia(motionQuery);
    let frame = 0;
    let nearby = false;

    const measure = () => {
      frame = 0;
      const bounds = section.getBoundingClientRect();
      const distance = marker.getBoundingClientRect().height;
      const playing = motion.matches && nearby && bounds.top <= window.innerHeight * .64 && bounds.bottom > 48;
      if (section.dataset.playing !== String(playing)) section.dataset.playing = String(playing);
      if (distance > 0 && nearby) {
        setCurrent(Math.max(0, Math.min(slides.length - 1, Math.round(-bounds.top / distance))));
      }
    };

    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const updateMode = () => {
      section.dataset.pinned = String(motion.matches);
      queue();
    };

    const onScroll = () => {
      if (nearby && motion.matches) queue();
    };

    const observer = new IntersectionObserver(([entry]) => {
      nearby = Boolean(entry?.isIntersecting);
      queue();
    }, { rootMargin: "160px 0px" });
    observer.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", queue);
    motion.addEventListener("change", updateMode);
    updateMode();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", queue);
      motion.removeEventListener("change", updateMode);
      delete section.dataset.pinned;
      delete section.dataset.playing;
    };
  }, [slides.length]);

  return (
    <section id={id} className={className} aria-labelledby={`${id}-title`}>
      <div className={styles.track} ref={track} data-story-track={id}>
        <div className={styles.stage}>
          <div className={styles.shell}>
            <header className={styles.heading}>
              <h2 id={`${id}-title`}>{title}</h2>
              <span>{note}</span>
            </header>
            <div className={styles.panel}>
              {backdrop && <div className={styles.backdrop} aria-hidden="true">{backdrop(current)}</div>}
              {slides.map((slide, index) => (
                <article
                  className={styles.slide}
                  data-story-active={index === current}
                  aria-label={slide.label}
                  key={slide.label}
                >
                  {slide.content}
                </article>
              ))}
            </div>
            <div className={styles.progress}><Timeline labels={slides.map(({ label }) => label)} current={current} /></div>
          </div>
        </div>
        <div className={styles.rail} ref={rail} aria-hidden="true">
          {slides.map(({ label }) => <div className={styles.beat} key={label} />)}
        </div>
      </div>
      {children}
    </section>
  );
}
