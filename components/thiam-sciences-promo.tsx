import Image from "next/image";
import { CalendarDays, CheckCircle2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { ThiamSciencesCtaButtons } from "@/components/thiam-sciences-cta-buttons";
import { getContestSettings } from "@/lib/contest/settings";

const PROGRAM_ITEMS = [
  "Correction détaillée d'anciennes épreuves",
  "Méthodologie pour augmenter vos chances de réussite",
  "Astuces et stratégies du concours",
  "Guide complet du dépôt des candidatures",
];

const TESTIMONIALS = [
  "🥳🥳🥳 J'ai réussi pour le département DSTI. Merci 🙏🏾",
  "Salut monsieur, juste pour vous dire que j'ai réussi le concours Alhamdoulillah 😊. Merci beaucoup, c'est grâce à votre aide particulièrement 😊❤️",
  "Je viens de voir que je suis prise, merci (sciences agricoles)",
  "Bonjour, moi aussi j'ai réussi 🎉. Merci vraiment pour tout (DGO)",
  "Bonsoir Monsieur, j'ai réussi, merci beaucoup (DSTI).",
  "Bonsoir Mr Thiam, j'ai réussi 💃 géomatique 💃 merci à vous",
];

/**
 * Encart partenaire (page d'accueil) — Thiam Sciences propose un
 * accompagnement payant au concours, distinct des archives gratuites du
 * site. D'où le badge « Partenaire » : le site reste par ailleurs non
 * affilié à l'administration de l'UAM (voir README).
 *
 * Le lien d'inscription (paiement) et le numéro de téléphone viennent de
 * `contest_settings.partner`, éditable depuis /admin/parametres — pas en
 * dur dans le code, pour rester modifiable sans déploiement et tracé dans
 * l'historique des modifications.
 */
export async function ThiamSciencesPromo() {
  const { partner } = await getContestSettings();
  if (!partner.enabled) return null;

  return (
    <section
      id="thiam-sciences"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16 sm:px-6"
    >
      <Card className="border-primary/20 from-primary/5 to-card overflow-hidden bg-gradient-to-b py-0">
        <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-start">
          <div className="flex flex-row items-center gap-3 lg:flex-col lg:items-start">
            <span className="ring-primary/15 relative size-16 shrink-0 overflow-hidden rounded-2xl ring-4 sm:size-20">
              <Image
                src="/thiam-sciences-logo.jpg"
                alt=""
                fill
                sizes="(min-width: 640px) 80px, 64px"
                className="object-cover"
              />
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Partenaire
            </Badge>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Préparez le concours avec THIAM SCIENCES
            </h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium tracking-wide uppercase">
              Préparation au concours Polytech Diamniadio
            </p>
            <p className="text-foreground/90 mt-4 max-w-2xl">
              Thiam Sciences vous accompagne dans votre réussite grâce à une préparation
              complète du concours d&apos;entrée.
            </p>

            <div className="mt-5">
              <p className="text-sm font-semibold">Au programme</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {PROGRAM_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      className="text-primary mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                Début le 20 juillet
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="size-4" aria-hidden="true" />
                Inscription : 5 000 FCFA
              </span>
            </div>

            <ThiamSciencesCtaButtons
              registrationUrl={partner.registrationUrl}
              phoneDisplay={partner.phoneDisplay}
              phoneHref={partner.phoneHref}
            />
          </div>
        </CardContent>

        <CardContent className="border-t px-6 py-6 sm:px-8">
          <h3 className="text-lg font-semibold">Ils ont réussi grâce à Thiam Sciences</h3>
          <div className="mt-4">
            <TestimonialsCarousel testimonials={TESTIMONIALS} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
