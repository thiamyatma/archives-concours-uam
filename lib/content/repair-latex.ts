/**
 * Répare une corruption d'encodage rencontrée dans les fichiers source :
 * des commandes LaTeX (`\times`, `\frac`, `\vec`, `\approx`, ...) sont
 * passées par un traitement qui a interprété leur backslash + première
 * lettre comme une séquence d'échappement C (`\t`, `\f`, `\v`, `\a`, `\b`),
 * remplaçant les deux caractères par le caractère de contrôle correspondant
 * et avalant le reste. Ex : `\times` devient TAB (code 9) + `imes`,
 * `\frac{` devient FORM FEED (code 12) + `rac{`.
 *
 * La réparation est déterministe (le caractère de contrôle indique
 * exactement quelle lettre d'échappement a été consommée), mais ne doit
 * s'appliquer qu'à l'intérieur des spans mathématiques `$...$`/`$$...$$` :
 * un de ces caractères en dehors (rare, mais possible dans une indentation
 * exotique) n'a rien à voir avec une commande LaTeX corrompue et ne doit
 * pas être touché. Caractères construits via `String.fromCharCode` plutôt
 * qu'écrits littéralement, pour ne jamais faire cohabiter un octet de
 * contrôle invisible avec du code source relisable.
 */

const BELL = String.fromCharCode(7); // \a  (ex: \approx)
const BACKSPACE = String.fromCharCode(8); // \b  (aucun cas réel confirmé pour l'instant)
const TAB = String.fromCharCode(9); // \t  (ex: \times)
const VERTICAL_TAB = String.fromCharCode(11); // \v  (ex: \vec)
const FORM_FEED = String.fromCharCode(12); // \f  (ex: \frac)

const CONTROL_CHAR_TO_ESCAPE: Record<string, string> = {
  [BELL]: "\\a",
  [BACKSPACE]: "\\b",
  [TAB]: "\\t",
  [VERTICAL_TAB]: "\\v",
  [FORM_FEED]: "\\f",
};

const CONTROL_CHAR_RE = new RegExp(
  `[${BELL}${BACKSPACE}${TAB}${VERTICAL_TAB}${FORM_FEED}]`,
  "g"
);

const MATH_SPAN_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g;

function repairSpan(span: string): string {
  return span.replace(CONTROL_CHAR_RE, (ch) => CONTROL_CHAR_TO_ESCAPE[ch] ?? ch);
}

export function repairLatexEscapes(markdown: string): string {
  return markdown.replace(MATH_SPAN_RE, repairSpan);
}
