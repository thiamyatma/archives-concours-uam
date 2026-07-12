import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Client Supabase pour Server Components / Server Actions / Route Handlers.
 * Utilise le cookie de session de l'utilisateur (admin connecté ou visiteur anonyme),
 * donc soumis aux policies RLS classiques.
 *
 * Certains appelants (generateStaticParams, sitemap.xml) s'exécutent hors de
 * toute requête HTTP : `cookies()` y lève une erreur. On bascule alors sur un
 * client anonyme sans cookie — suffisant puisque ces contextes ne lisent que
 * des données publiques (filieres, documents approuvés).
 */
export async function createClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() ?? [];
        },
        setAll(cookiesToSet) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component sans écriture possible :
            // sans conséquence si le middleware rafraîchit déjà la session.
          }
        },
      },
    }
  );
}
