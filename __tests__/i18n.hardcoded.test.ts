import path from 'path';

// Static guard against mixed-language UI (see scripts/i18n-audit.js for the rules).
// Run `npm run i18n:audit` for a readable report.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { audit } = require('../scripts/i18n-audit');

describe('i18n hardcoded-string guard', () => {
  const { violations } = audit(path.resolve(__dirname, '..'));
  const format = (rule: string) =>
    violations
      .filter((v: any) => v.rule.startsWith(rule))
      .map((v: any) => `${v.file}${v.line ? `:${v.line}` : ''}  ${v.text}`);

  test('R1: no hardcoded visible JSX text outside i18n / language ternaries', () => {
    expect(format('R1')).toEqual([]);
  });

  test('R2: no unguarded literal in UI props (placeholder, title, label, message…)', () => {
    expect(format('R2')).toEqual([]);
  });

  test('R3: Turkish literals are language-guarded or canonical values only', () => {
    expect(format('R3')).toEqual([]);
  });

  test('R4: every t() key exists in both tr.ts and en.ts', () => {
    expect(format('R4')).toEqual([]);
  });

  test('R5: English dictionary contains no Turkish text', () => {
    expect(format('R5')).toEqual([]);
  });

  test('R6: every local fallback card has an English entry', () => {
    expect(format('R6')).toEqual([]);
  });
});
