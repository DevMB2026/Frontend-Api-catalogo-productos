import { useEffect, useRef, useState } from 'react';
import './Hero.css';

// PLACEHOLDERS: reemplaza estas 3 constantes por tu video/imágenes reales cuando los tengas.
const HERO_VIDEO_URL = 'https://prezenza.com/wp-content/uploads/2025/08/NO-2-PREZENZA-1.mp4';
const HERO_IMAGE_START = 'https://prezenza.com/wp-content/uploads/2025/07/WhatsApp-Image-2025-07-09-at-10.24.32-AM-430x563.jpeg';
const HERO_IMAGE_END = 'https://prezenza.com/wp-content/uploads/2025/07/WhatsApp-Image-2025-07-09-at-10.24.32-AM-430x563.jpeg';

// Textos de ejemplo — edítalos libremente.
const HERO_EYEBROW = 'Nueva colección';
const HERO_TITLE = 'Prezenza';
const HERO_CTA_LABEL = 'Ver catálogo';
const HERO_CTA_HREF = '#productos';

export default function Hero() {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="hero" data-active={active}>
      <div className="hero__sticky">
        <div className="hero__tile hero__tile--start" style={{ '--index': 0 }}>
          <img src={HERO_IMAGE_START} alt="" loading="lazy" />
        </div>

        <div className="hero__visual">
          <video
            className="hero__video"
            src={HERO_VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="hero__overlay">
            <p className="hero__eyebrow">{HERO_EYEBROW}</p>
            <h1 className="hero__title">{HERO_TITLE}</h1>
            <a className="hero__cta" href={HERO_CTA_HREF}>{HERO_CTA_LABEL}</a>
          </div>
        </div>

        <div className="hero__tile hero__tile--end" style={{ '--index': 1 }}>
          <img src={HERO_IMAGE_END} alt="" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
