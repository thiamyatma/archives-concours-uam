import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { SITE_NAME, SITE_SLOGAN, CONTACT_EMAIL } from "@/lib/constants";
import { DEPARTEMENTS } from "@/lib/departements";
import { TrackContactLink } from "@/components/analytics/track-contact-link";

export function Footer() {
  return (
    <footer className="bg-secondary/40 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/uam-logo.webp"
              alt="Université Amadou Mahtar Mbow"
              width={56}
              height={74}
              className="h-16 w-auto"
            />
            <span className="font-semibold">{SITE_NAME}</span>
          </Link>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm">{SITE_SLOGAN}</p>
          <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
            <Mail className="size-4" aria-hidden="true" />
            <TrackContactLink
              email={CONTACT_EMAIL}
              className="hover:text-primary hover:underline"
            />
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Navigation</h3>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li>
              <Link href="/departements" className="hover:text-primary hover:underline">
                Départements
              </Link>
            </li>
            <li>
              <Link href="/assistant" className="hover:text-primary hover:underline">
                Assistant IA
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Départements</h3>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            {DEPARTEMENTS.map((d) => (
              <li key={d.code}>
                <Link
                  href={`/departements/${d.code}`}
                  className="hover:text-primary hover:underline"
                >
                  {d.nom}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t">
        <p className="text-muted-foreground mx-auto max-w-6xl px-4 py-4 text-center text-xs sm:px-6">
          © {new Date().getFullYear()} {SITE_NAME}. Plateforme communautaire et gratuite,
          non affiliée officiellement à l&apos;administration de l&apos;UAM.
        </p>
      </div>
    </footer>
  );
}
