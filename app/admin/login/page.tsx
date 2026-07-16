"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin, type AdminLoginResult } from "@/lib/actions/admin-auth";

async function action(_prev: AdminLoginResult | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  return loginAdmin(email, password);
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [result, formAction, pending] = useActionState<AdminLoginResult | null, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (result?.success) router.push("/admin");
  }, [result, router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Espace admin</CardTitle>
          <CardDescription>Connectez-vous pour gérer le concours.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {result?.error && <p className="text-destructive text-sm">{result.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
