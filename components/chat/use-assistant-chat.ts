"use client";

import { useCallback, useRef, useState } from "react";

export interface ChatSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
  isError?: boolean;
}

type SseEvent =
  | { type: "sources"; sources: ChatSource[] }
  | { type: "token"; value: string }
  | { type: "error"; message: string }
  | { type: "done" };

function newId() {
  return crypto.randomUUID();
}

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed };
      const assistantId = newId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      function updateAssistant(patch: Partial<ChatMessage>) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m))
        );
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null);
          updateAssistant({
            content:
              body?.error ??
              "L'assistant IA est momentanément indisponible. Réessayez plus tard.",
            isStreaming: false,
            isError: true,
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const line = rawEvent.trim();
            if (!line.startsWith("data:")) continue;

            let parsed: SseEvent;
            try {
              parsed = JSON.parse(line.slice("data:".length).trim());
            } catch {
              continue;
            }

            if (parsed.type === "sources") {
              updateAssistant({ sources: parsed.sources });
            } else if (parsed.type === "token") {
              content += parsed.value;
              updateAssistant({ content });
            } else if (parsed.type === "error") {
              updateAssistant({ content: parsed.message, isError: true });
            } else if (parsed.type === "done") {
              updateAssistant({ isStreaming: false });
            }
          }
        }

        updateAssistant({ isStreaming: false });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          updateAssistant({
            content: "La connexion à l'assistant a été interrompue. Réessayez.",
            isStreaming: false,
            isError: true,
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, ask, isStreaming, reset };
}
