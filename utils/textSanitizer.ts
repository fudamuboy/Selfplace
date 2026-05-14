/**
 * Sanitizes text by stripping all HTML tags and trimming whitespace.
 * Prevents raw markup from appearing in the UI.
 * 
 * @param text The string potentially containing HTML
 * @param fallback Optional fallback text if sanitized result is empty
 * @returns Cleaned text or fallback
 */
export const sanitizeText = (text: string | null | undefined, fallback: string = ''): string => {
  if (!text) return fallback;

  // 1. Strip HTML tags
  const clean = text
    .replace(/<[^>]*>/g, '') // Remove <tag>
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&lt;/g, '<')    // Restore entities if needed
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

  // 2. Return fallback if empty
  if (!clean || clean.length === 0) {
    return fallback;
  }

  return clean;
};
