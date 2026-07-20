"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Vitesse modérée : assez lente pour lire une carte entière pendant son
// passage, assez visible pour ne pas paraître figée.
const SCROLL_SPEED_PX_PER_SECOND = 40;
// Délai avant reprise du défilement après une interaction manuelle
// (scroll/tactile/molette/flèches).
const RESUME_DELAY_MS = 4000;
const SCROLL_END_TOLERANCE_PX = 4;

/**
 * Bandeau de témoignages en défilement automatique continu (marquee) : dès
 * l'affichage, la liste avance en boucle infinie vers la gauche, à vitesse
 * lente et régulière — pas par sauts de page comme un carrousel classique.
 * L'utilisateur qui scrolle, touche ou survole le bandeau reprend la main
 * immédiatement (le défilement auto s'arrête et reprend après quelques
 * secondes d'inactivité). Aucune dépendance externe :
 * - le défilement continu est piloté par `requestAnimationFrame` sur
 *   `scrollLeft`, avec la liste dupliquée une fois pour boucler sans à-coup
 *   (technique marquee classique : à mi-parcours du contenu dupliqué, la
 *   vue est visuellement identique à son point de départ) ;
 * - le scroll-snap natif reste actif pour le contrôle manuel (swipe,
 *   trackpad, flèches) ;
 * - `prefers-reduced-motion` désactive uniquement l'auto-scroll, le
 *   contrôle manuel reste disponible.
 */
export function TestimonialsCarousel({ testimonials }: { testimonials: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Deux causes de pause indépendantes, combinées ci-dessous : le survol se
  // lève dès que la souris quitte le bandeau, mais ne doit pas annuler une
  // pause d'interaction (molette/tactile) encore dans son délai — sinon
  // bouger la souris juste après avoir scrollé relance l'auto-scroll
  // immédiatement au lieu d'attendre la fin du délai d'inactivité.
  const [isHovering, setIsHovering] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const isPaused = isHovering || isInteracting;
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseThenResume = useCallback(() => {
    setIsInteracting(true);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsInteracting(false), RESUME_DELAY_MS);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    },
    []
  );

  const scrollByPage = useCallback(
    (direction: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      pauseThenResume();

      if (
        direction === 1 &&
        el.scrollLeft + el.clientWidth >= el.scrollWidth - SCROLL_END_TOLERANCE_PX
      ) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      if (direction === -1 && el.scrollLeft <= SCROLL_END_TOLERANCE_PX) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
        return;
      }
      el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
    },
    [pauseThenResume]
  );

  // Défilement continu (requestAnimationFrame) : avance `scrollLeft` à
  // vitesse constante, boucle sans à-coup grâce à la liste dupliquée.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (isPaused) return;

    let frameId: number;
    let lastTimestamp: number | null = null;
    const halfWidth = el.scrollWidth / 2;

    const tick = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const deltaSeconds = (timestamp - lastTimestamp) / 1000;
        el.scrollLeft += SCROLL_SPEED_PX_PER_SECOND * deltaSeconds;
        if (el.scrollLeft >= halfWidth) el.scrollLeft -= halfWidth;
      }
      lastTimestamp = timestamp;
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [isPaused, testimonials]);

  return (
    <div
      role="region"
      aria-label="Témoignages d'élèves admis grâce à Thiam Sciences"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={() => setIsHovering(true)}
      onBlurCapture={() => setIsHovering(false)}
    >
      <div
        ref={scrollerRef}
        onWheel={pauseThenResume}
        onTouchStart={pauseThenResume}
        onPointerDown={pauseThenResume}
        // `snap-x`/`snap-mandatory` seulement pendant une pause (interaction
        // manuelle) : `scroll-snap-type: mandatory` fait sinon ignorer les
        // micro-incréments de `scrollLeft` du défilement continu (Chromium
        // les traite comme hors-cible et les re-snappe instantanément à 0,
        // donc rien ne bouge jamais). Idem pour `scroll-smooth` : elle
        // relancerait une animation "smooth" à chaque frame vers une cible
        // sans arrêt déplacée. Les flèches demandent déjà leur propre
        // "smooth" explicitement via `behavior: "smooth"`.
        className={cn(
          "flex [scrollbar-width:none] gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden",
          isPaused && "snap-x snap-mandatory scroll-smooth"
        )}
      >
        {[...testimonials, ...testimonials].map((quote, index) => (
          <blockquote
            key={index}
            aria-hidden={index >= testimonials.length ? true : undefined}
            className="bg-card w-[85%] shrink-0 snap-start rounded-xl border px-5 py-6 shadow-sm sm:w-[45%] lg:w-[31%]"
          >
            <Quote className="text-primary/40 size-6" aria-hidden="true" />
            <p className="text-foreground/90 mt-3 text-sm text-balance">{quote}</p>
          </blockquote>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => scrollByPage(-1)}
          aria-label="Témoignage précédent"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => scrollByPage(1)}
          aria-label="Témoignage suivant"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
