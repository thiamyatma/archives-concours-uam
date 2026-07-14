import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tableau de bord admin",
  robots: { index: false, follow: false },
};

// Contenu privé propre à l'utilisateur connecté : jamais de prerendering statique.
export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="bg-secondary/20 min-h-[calc(100vh-theme(spacing.16))]">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="relative size-8 overflow-hidden rounded-lg">
              <Image
                src="/uam-mark.png"
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
            <span>{SITE_NAME} — Admin</span>
          </Link>
          <nav
            aria-label="Navigation admin"
            className="hidden items-center gap-1 md:flex"
          >
            <Link
              href="/admin"
              className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm font-medium"
            >
              Documents
            </Link>
            <Link
              href="/admin/contributeurs"
              className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm font-medium"
            >
              Contributeurs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
