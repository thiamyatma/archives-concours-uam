import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata: Metadata = {
  title: "Assistant IA",
  description:
    "Posez vos questions sur l'UAM et Polytech Diamniadio (filières, admission, campus…) à un assistant IA basé sur le contenu officiel de polytech.sn.",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-4 space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Assistant IA — UAM
        </h1>
        <p className="text-muted-foreground text-sm">
          Répond à vos questions sur l&apos;école à partir du contenu public de{" "}
          <a
            href="https://polytech.sn"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            polytech.sn
          </a>
          . Assistant communautaire non officiel — vérifiez les informations sensibles
          directement auprès de l&apos;école.
        </p>
      </div>
      <div className="min-h-0 flex-1 rounded-2xl border shadow-sm">
        <ChatPanel className="h-full" />
      </div>
    </div>
  );
}
