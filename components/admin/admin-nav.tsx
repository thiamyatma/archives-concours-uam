"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Statistiques" },
  { href: "/admin/analytics", label: "Analytics QCM" },
  { href: "/admin/epreuves", label: "Gestion des épreuves" },
  { href: "/admin/parametres", label: "Paramètres du concours" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex gap-1 overflow-x-auto border-b">
      {LINKS.map((link) => {
        // Actif aussi sur les sous-routes (ex. /admin/analytics/candidats).
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
