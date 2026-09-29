/** A scene caption invites inspection; the full narrative stays in the clue panel. */
export function photoCaptionLead(text: string): string {
  const sentence = text.match(/^.*?[。！？]/u)?.[0] ?? text;
  const characters = Array.from(sentence.trim());
  return characters.length <= 38 ? sentence.trim() : `${characters.slice(0, 37).join('')}…`;
}
