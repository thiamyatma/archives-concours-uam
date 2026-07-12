import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Connexion administrateur",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="bg-secondary/30 flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center px-4 py-14">
      <div className="bg-card w-full max-w-sm space-y-6 rounded-2xl border p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/">
            <Image
              src="/uam-logo.webp"
              alt="Université Amadou Mahtar Mbow"
              width={70}
              height={92}
              className="h-20 w-auto"
              priority
            />
          </Link>
          <h1 className="text-xl font-semibold">Espace administrateur</h1>
          <p className="text-muted-foreground text-sm">{SITE_NAME}</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
