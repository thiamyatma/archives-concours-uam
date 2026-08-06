import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Les illustrations d'une épreuve (`public/archives/**`) sont toutes situées
 * loin dans la page — un candidat qui ouvre l'épreuve n'en voit aucune avant
 * d'avoir beaucoup fait défiler. Sans `loading="lazy"`, le navigateur les
 * télécharge pourtant toutes au chargement : jusqu'à ~190 Ko par affichage,
 * robots compris. Elles sont par ailleurs servies avec un `Cache-Control`
 * long (voir next.config.ts).
 */
const components: Components = {
  img({ node, ...props }) {
    void node;
    return (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- image d'archive statique, dimensions variables ; `alt` vient du Markdown
      <img {...props} loading="lazy" decoding="async" />
    );
  },
};

/**
 * Rendu Markdown des épreuves. Server Component : react-markdown/remark/
 * rehype/katex n'ont besoin d'aucune API navigateur, donc ce composant
 * n'ajoute aucun JavaScript au bundle client.
 */
export function MarkdownRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
