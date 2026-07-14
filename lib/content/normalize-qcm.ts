/**
 * Les questions à choix multiples du fichier source ressemblent à :
 *
 *   1. Énoncé de la question...
 *      A. Option A
 *      B. Option B
 *
 * Les lignes "A."/"B."/... indentées sous un item de liste numérotée ne
 * sont PAS des marqueurs de liste CommonMark valides (seuls les chiffres
 * sont reconnus) : un renderer strict les traiterait comme une simple
 * continuation du paragraphe précédent, fusionnant visuellement toutes les
 * options sur une seule ligne. Cette passe insère un saut de ligne dur
 * Markdown (deux espaces en fin de ligne) sur toute ligne non vide dont la
 * ligne suivante commence par une indentation, pour forcer un retour à la
 * ligne à l'affichage sans changer le texte lui-même.
 *
 * Les listes à puces de l'en-tête (`- Sciences Agricoles...`) ne sont pas
 * indentées (colonne 0) donc ne sont jamais concernées par cette règle.
 * Les blocs de code indentés/en clôture sont ignorés par précaution.
 */
export function insertHardLineBreaksForListContinuations(markdown: string): string {
  const lines = markdown.split("\n");
  let inFencedCodeBlock = false;

  return lines
    .map((line, index) => {
      if (/^```/.test(line.trim())) {
        inFencedCodeBlock = !inFencedCodeBlock;
        return line;
      }
      if (inFencedCodeBlock) return line;

      const isBlank = line.trim().length === 0;
      const alreadyHardBroken = line.endsWith("  ");
      const nextLine = lines[index + 1];
      const nextLineIsIndentedContinuation =
        nextLine !== undefined && /^[ \t]+\S/.test(nextLine);

      if (!isBlank && !alreadyHardBroken && nextLineIsIndentedContinuation) {
        return `${line}  `;
      }
      return line;
    })
    .join("\n");
}
