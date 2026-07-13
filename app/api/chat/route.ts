import { z } from "zod";
import { searchPolytechChunks } from "@/lib/rag/search";
import { streamRagAnswer } from "@/lib/rag/groq";
import { checkAndRecordRagRateLimit, getClientIp } from "@/lib/rag/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "La question est trop courte.")
    .max(500, "La question est trop longue (500 caractères max)."),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 }
    );
  }

  const ip = getClientIp(request.headers);
  const rateLimit = await checkAndRecordRagRateLimit(ip);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Limite de ${rateLimit.limit} questions/24h atteinte pour l'assistant IA. Réessayez plus tard.`,
      },
      { status: 429 }
    );
  }

  const { question } = parsed.data;
  const chunks = await searchPolytechChunks(question);
  const stream = streamRagAnswer({ question, chunks });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Ratelimit-Remaining": String(rateLimit.remaining),
    },
  });
}
