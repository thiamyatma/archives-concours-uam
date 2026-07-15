import "server-only";
import { env } from "@/lib/env";
import type { RetrievedChunk } from "@/lib/rag/search";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es l'assistant IA de "Archives Concours UAM", un site communautaire non
officiel destiné aux candidats du concours d'entrée de l'Université Amadou Mahtar
Mbow (UAM) / Polytech Diamniadio.

Ton rôle : répondre aux questions sur l'école (admissions, filières, campus,
frais, calendrier, contacts, etc.) EN TE BASANT UNIQUEMENT sur les extraits du
site officiel polytech.sn fournis ci-dessous dans le contexte.

Règles strictes :
- N'utilise que les informations présentes dans le contexte fourni. N'invente
  jamais un chiffre, une date ou une procédure qui n'y figure pas.
- Si le contexte ne permet pas de répondre, dis-le clairement et invite la
  personne à consulter directement polytech.sn ou à contacter l'école, plutôt
  que de deviner.
- Réponds toujours en français, de façon claire, concise et bienveillante.
- Précise que tu es un assistant communautaire non officiel si la question
  porte sur une décision administrative sensible (frais exacts, dates
  limites) et recommande de vérifier sur le site officiel.
- N'invente jamais de lien : cite uniquement les URLs présentes dans le contexte.`;

export interface RagAnswerRequest {
  question: string;
  chunks: RetrievedChunk[];
}

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(Aucun extrait pertinent trouvé dans l'index de polytech.sn pour cette question.)";
  }

  return chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}] ${chunk.pageTitle} — ${chunk.pageUrl}\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}

type SseEvent =
  | { type: "sources"; sources: { title: string; url: string }[] }
  | { type: "token"; value: string }
  | { type: "error"; message: string }
  | { type: "done" };

function encodeSse(event: SseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Appelle l'API Groq (compatible OpenAI) en streaming et renvoie un
 * ReadableStream au format SSE, prêt à être utilisé comme corps de réponse
 * d'un Route Handler Next.js. Protocole custom léger (pas de dépendance
 * externe) : chaque événement est un JSON `{ type, ... }`.
 */
export function streamRagAnswer({
  question,
  chunks,
}: RagAnswerRequest): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const sources = dedupeSources(chunks);
      controller.enqueue(encodeSse({ type: "sources", sources }));

      if (!env.GROQ_API_KEY) {
        controller.enqueue(
          encodeSse({
            type: "error",
            message:
              "L'assistant IA n'est pas configuré (GROQ_API_KEY manquant côté serveur).",
          })
        );
        controller.enqueue(encodeSse({ type: "done" }));
        controller.close();
        return;
      }

      try {
        const upstream = await fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: env.GROQ_MODEL,
            stream: true,
            temperature: 0.2,
            // Plafond volontaire : le plan gratuit Groq a un quota strict de
            // tokens/jour (TPD), et une réponse sans limite peut en consommer
            // plusieurs centaines à elle seule. 600 tokens en sortie suffit
            // à une réponse claire et concise (déjà demandé au system prompt).
            max_tokens: 600,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Contexte (extraits de polytech.sn) :\n\n${buildContext(
                  chunks
                )}\n\nQuestion du candidat : ${question}`,
              },
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          throw new Error(`Groq API ${upstream.status}: ${detail.slice(0, 300)}`);
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const payload = trimmed.slice("data:".length).trim();
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encodeSse({ type: "token", value: delta }));
              }
            } catch {
              // Ligne SSE partielle ou non-JSON : ignorée sans interrompre le flux.
            }
          }
        }

        controller.enqueue(encodeSse({ type: "done" }));
      } catch (error) {
        console.error("Échec du streaming Groq:", error);
        controller.enqueue(
          encodeSse({
            type: "error",
            message:
              "L'assistant IA est momentanément indisponible. Réessayez plus tard.",
          })
        );
        controller.enqueue(encodeSse({ type: "done" }));
      } finally {
        controller.close();
      }
    },
  });
}

function dedupeSources(chunks: RetrievedChunk[]) {
  const seen = new Map<string, { title: string; url: string }>();
  for (const chunk of chunks) {
    if (!seen.has(chunk.pageUrl)) {
      seen.set(chunk.pageUrl, { title: chunk.pageTitle, url: chunk.pageUrl });
    }
  }
  return Array.from(seen.values());
}
