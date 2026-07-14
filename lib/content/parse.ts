/**
 * Découpe une épreuve en un titre, un en-tête (école, département, durée...)
 * et une section par matière. Les matières ne sont plus une énumération
 * figée (voir docs/ARCHITECTURE.md) : ce sont simplement les titres des
 * rubriques `## ÉPREUVE ...` trouvées dans le fichier, dans l'ordre où
 * elles apparaissent.
 */

export interface MatiereSection {
  title: string;
  markdown: string;
}

export interface ParsedContent {
  title: string;
  enTete: string;
  sections: MatiereSection[];
}

const TITLE_RE = /^#[ \t]+(.+)$/m;
const EPREUVE_HEADING_RE = /^##[ \t]+(ÉPREUVE\b.*)$/gm;

export function parseConcoursMarkdown(raw: string): ParsedContent {
  const titleMatch = TITLE_RE.exec(raw);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const headings: { title: string; start: number; contentStart: number }[] = [];
  for (const match of raw.matchAll(EPREUVE_HEADING_RE)) {
    headings.push({
      title: match[1].trim(),
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  const enTete = raw.slice(0, headings[0]?.start ?? raw.length).trim();

  const sections: MatiereSection[] = headings.map((heading, index) => {
    const end = headings[index + 1]?.start ?? raw.length;
    return {
      title: heading.title,
      markdown: raw.slice(heading.contentStart, end).trim(),
    };
  });

  return { title, enTete, sections };
}
