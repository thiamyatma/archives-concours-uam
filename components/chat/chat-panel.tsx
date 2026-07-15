"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "@/components/chat/use-assistant-chat";

const SUGGESTED_QUESTIONS = [
  "Quelles filières propose Polytech Diamniadio ?",
  "Comment se déroule l'admission à l'UAM ?",
  "Où se trouve le campus de l'UAM ?",
];

export function ChatPanel({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { messages, ask, isStreaming } = useAssistantChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    void ask(input);
    setInput("");
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-muted-foreground space-y-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Sparkles className="text-primary size-4" aria-hidden="true" />
              Posez une question sur l&apos;UAM / Polytech Diamniadio
            </p>
            <p>
              Assistant communautaire non officiel, basé sur le contenu public de{" "}
              <span className="font-medium">polytech.sn</span>. Pour les informations
              sensibles (frais, dates limites), vérifiez toujours sur le site officiel.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => void ask(q)}
                  className="hover:bg-accent hover:text-accent-foreground rounded-full border px-3 py-1.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : message.isError
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground"
              )}
            >
              {message.content || (
                <span className="inline-flex items-center gap-1.5 opacity-70">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Recherche dans polytech.sn…
                </span>
              )}

              {message.sources && message.sources.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1 border-t pt-2 text-xs opacity-80">
                  <span className="font-medium">Sources :</span>
                  {message.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" />
                      {source.title || source.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Écrivez votre question…"
          rows={compact ? 1 : 2}
          className="max-h-32 min-h-10 resize-none"
          aria-label="Votre question pour l'assistant"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isStreaming || !input.trim()}
          aria-label="Envoyer"
        >
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
        </Button>
      </form>
    </div>
  );
}
