"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTOPLAY_INTERVAL_MS = 6000;
const SCROLL_END_TOLERANCE_PX = 4;

/**
 * Défilement horizontal en scroll-snap natif (swipe/trackpad/molette
 * fonctionnent sans JS) ; les flèches et l'autoplay ne font qu'appeler
 * scrollBy/scrollTo par-dessus. Pas de dépendance carousel externe pour un
 * simple bandeau de témoignages statiques.
 */
export function TestimonialsCarousel({ testimonials }: { testimonials: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;

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
  }, []);

  useEffect(() => {
    if (isPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => scrollByPage(1), AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPaused, scrollByPage]);

  return (
    <div
      role="region"
      aria-label="Témoignages d'élèves admis grâce à Thiam Sciences"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((quote, index) => (
          <blockquote
            key={index}
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
