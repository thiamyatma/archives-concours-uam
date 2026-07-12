import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    /*
     * Exclut les fichiers statiques et images pour ne rafraîchir la
     * session que sur les pages qui en ont réellement besoin.
     */
  ],
};
