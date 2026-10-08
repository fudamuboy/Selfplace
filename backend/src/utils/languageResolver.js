/**
 * Shared backend language resolver
 * 
 * Priority:
 * 1. x-app-language
 * 2. Accept-Language
 * 3. 'tr' (default)
 */
function getLanguage(req) {
  const rawLang = req?.headers?.['x-app-language'] || req?.headers?.['accept-language'] || req?.query?.lang;
  if (!rawLang) return 'tr';
  const str = String(rawLang).trim().toLowerCase();
  return str.startsWith('en') ? 'en' : 'tr';
}

module.exports = {
  getLanguage,
};
