"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/chat-panel";

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistant IA UAM"
          className="bg-background fixed inset-x-4 bottom-24 z-50 flex h-[70vh] max-h-[600px] flex-col rounded-xl border shadow-2xl sm:inset-x-auto sm:right-6 sm:w-96"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Assistant IA — UAM</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
            >
              <X className="size-4" />
            </Button>
          </div>
          <ChatPanel className="min-h-0 flex-1" compact />
        </div>
      )}

      <Button
        type="button"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-50 size-14 rounded-full shadow-lg"
        aria-label={open ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </>
  );
}
