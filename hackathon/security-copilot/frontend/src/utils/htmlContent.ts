const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

const decodeHtmlEntities = (text: string): string =>
  text.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/gi, (match) => HTML_ENTITY_MAP[match.toLowerCase()] ?? match);

/** Strip HTML tags and normalize whitespace for blog display. */
export function stripHtmlTags(input: string): string {
  if (!input || !/<\/?[a-z][^>]*>/i.test(input)) {
    return input;
  }

  let text = input;

  for (let level = 1; level <= 6; level += 1) {
    const hashes = '#'.repeat(level);
    const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
    text = text.replace(re, `\n${hashes} $1\n\n`);
  }

  text = text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*\/\s*li\s*>/gi, '')
    .replace(/<\s*blockquote[^>]*>/gi, '\n> ')
    .replace(/<\s*\/\s*blockquote\s*>/gi, '\n\n')
    .replace(/<\s*p[^>]*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*div[^>]*>/gi, '\n')
    .replace(/<\s*\/\s*div\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(text)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
