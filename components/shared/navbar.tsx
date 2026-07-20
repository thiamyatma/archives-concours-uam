"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/departements", label: "Départements" },
  { href: "/assistant", label: "Assistant IA" },
  { href: "/#thiam-sciences", label: "Thiam Sciences" },
];

/** true si `href` pointe vers la page courante ET, s'il porte une ancre
 * (ex. `/#thiam-sciences`), vers la section actuellement affichée. */
function isLinkActive(href: string, pathname: string, hash: string): boolean {
  const [path, anchor] = href.split("#");
  const targetPath = path || "/";
  if (anchor) return pathname === targetPath && hash === `#${anchor}`;
  // Sans ancre, "/" ne doit pas rester actif en même temps qu'un lien ancré
  // plus précis de la même page (ex. "/#thiam-sciences") : un seul lien
  // surligné à la fois.
  return targetPath === "/"
    ? pathname === "/" && hash === ""
    : pathname.startsWith(targetPath);
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Le hash n'existe que côté client : lu après montage, puis suivi au fil
  // de la navigation ancrée (clic sur un lien de la page, retour navigateur).
  const [hash, setHash] = useState("");
  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="relative size-9 overflow-hidden rounded-lg">
            <Image
              src="/uam-mark.png"
              alt=""
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          </span>
          <span className="text-base leading-tight sm:text-lg">{SITE_NAME}</span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden md:flex md:items-center md:gap-1"
        >
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(link.href, pathname, hash);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>{SITE_NAME}</SheetTitle>
            </SheetHeader>
            <nav aria-label="Navigation mobile" className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
