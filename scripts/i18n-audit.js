/**
 * i18n audit — detects mixed-language UI sources in the mobile app.
 *
 * Usage:  npm run i18n:audit          (report, exits 1 on violations)
 * Used by __tests__/i18n.hardcoded.test.ts to block regressions.
 *
 * Rules
 *  R1 jsx-text       Visible JSX text must come from t() / a language ternary (brand names allowlisted).
 *  R2 ui-attribute   UI props (placeholder, title, label, message…) must not be unguarded literals.
 *  R3 turkish-literal Turkish literals must be language-guarded, canonical values, or matching logic.
 *  R4 missing-key    Every t('key') must exist in both tr.ts and en.ts.
 *  R5 en-has-turkish en.ts values must not contain Turkish text (allowlisted bilingual keys excepted).
 *  R6 cardpool       Every local fallback card must have an English entry.
 *  info: unused-keys (approximate — keys can be built dynamically).
 *
 * User-authored content is never inspected or touched: this only reads source code.
 */
const fs = require('fs');
const path = require('path');

const TR_CHARS = /[çğıİöşüÇĞÖŞÜ]/;
const SCAN_DIRS = ['app', 'components', 'store', 'utils', 'api', 'constants', 'hooks'];
const UI_ATTRS = /^(placeholder|title|label|message|subtitle|description|text|accessibilityLabel|accessibilityHint|buttonText|confirmText|cancelText|secondaryText|emptyText|headerTitle)$/;
const LANG_TEST = /\b(isEn|isTr|isTurkish|isEnglish|language|lang|currentLang|locale)\b/;
const MATCH_CALLS = /\.(includes|startsWith|endsWith|replace|indexOf|some|find|filter|test|match|split)$/;
const CANONICAL_PROPS = /^(id|value|key|canonical|mood|type|category|code)$/;

// Visible text that is intentionally identical in both languages
const JSX_TEXT_ALLOW = [/^Selfplace( (AI|Plus|Signature|Premium|v[\d.]+))?$/, /^[“”"'&a-z;]+$/i];
// Files whose literals are intentionally bilingual or canonical data, with the reason
const FILE_ALLOW = {
  'app/language-selection.tsx': 'shown before a language is chosen; deliberately bilingual',
  'utils/cardPool.ts': 'Turkish pool keyed by id; English map checked by rule R6',
  'constants/themeModes.ts': 'theme.name is only a fallback; theme-selection displays THEME_NAMES[id].tr/.en',
  'utils/patch-iap.js': 'build script, not UI',
  'utils/patch-expo-xcode27.js': 'build script, not UI',
};
// Dictionary keys that are deliberately bilingual
const EN_DICT_ALLOW = new Set(['languageSelection.header', 'languageSelection.tr']);

function loadTs(root) {
  return require(path.join(root, 'node_modules/typescript'));
}

function loadDict(ts, file, name) {
  const src = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out)(m, m.exports, () => ({}));
  return m.exports[name];
}

function flatten(o, p = '', acc = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, acc);
    else acc[key] = v;
  }
  return acc;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function audit(root) {
  const ts = loadTs(root);
  const trFlat = flatten(loadDict(ts, path.join(root, 'i18n/tr.ts'), 'tr'));
  const enFlat = flatten(loadDict(ts, path.join(root, 'i18n/en.ts'), 'en'));
  const violations = [];
  const usedKeys = new Set();
  const dynamicKeyPrefixes = new Set();

  const isGuarded = (node) => {
    for (let n = node; n && n.parent; n = n.parent) {
      const p = n.parent;
      if (ts.isConditionalExpression(p) && (p.whenTrue === n || p.whenFalse === n) && LANG_TEST.test(p.condition.getText())) return true;
      if (ts.isIfStatement(p) && LANG_TEST.test(p.expression.getText())) return true;
      if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && LANG_TEST.test(p.left.getText())) return true;
      if (ts.isPropertyAssignment(p) && p.initializer === n && /^['"]?(tr|en|[A-Za-z]*(Tr|_tr|En|_en))['"]?$/.test(p.name.getText())) return true;
      // Per-language data sets, e.g. const FAQ_DATA_TR = [...] selected with isEn ? FAQ_DATA_EN : FAQ_DATA_TR
      if (ts.isVariableDeclaration(p) && /(_TR|_EN|Tr|En)$/.test(p.name.getText())) return true;
      if (ts.isFunctionLike(p)) break;
    }
    return false;
  };

  // Literal used to match/compare stored values (canonical-value logic), not to display text
  const isMatchingLogic = (node) => {
    const p = node.parent;
    if (ts.isCaseClause(p)) return true;
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
    if (ts.isCallExpression(p) && MATCH_CALLS.test(p.expression.getText()) && p.arguments.includes(node)) return true;
    if (ts.isArrayLiteralExpression(p)) {
      const gp = p.parent;
      if (ts.isPropertyAccessExpression(gp) && /^(some|includes|find|filter|every|indexOf)$/.test(gp.name.text)) return true;
      if (ts.isVariableDeclaration(gp) && /keyword|Keywords|KEYWORDS/.test(gp.name.getText())) return true;
    }
    if (ts.isPropertyAssignment(p) && p.initializer === node && CANONICAL_PROPS.test(p.name.getText())) return true;
    if (ts.isPropertyAssignment(p) && p.name === node) return true; // object key, e.g. { 'Mutlu': 'Happy' }
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
    return false;
  };

  for (const file of SCAN_DIRS.flatMap(d => walk(path.join(root, d)))) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
    const add = (rule, n, text) => violations.push({ rule, file: rel, line: line(n), text: text.replace(/\s+/g, ' ').trim().slice(0, 120) });
    const fileAllowed = !!FILE_ALLOW[rel];

    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't' && n.arguments[0]) {
        const a = n.arguments[0];
        if (ts.isStringLiteralLike(a)) usedKeys.add(a.text);
        else if (ts.isTemplateExpression(a)) dynamicKeyPrefixes.add(a.head.text);
      }
      if (!fileAllowed) {
        if (ts.isJsxText(n)) {
          const text = n.getText().trim();
          if (/[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/.test(text) && !JSX_TEXT_ALLOW.some(r => r.test(text)) && !isGuarded(n)) add('R1 jsx-text', n, text);
        } else if (ts.isStringLiteralLike(n) && /[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/.test(n.text)) {
          const p = n.parent;
          const attr = ts.isJsxAttribute(p) ? p : (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent) ? p.parent : null);
          if (attr && UI_ATTRS.test(attr.name.getText()) && !isGuarded(n) && !/^\S+@\S+$/.test(n.text)) add('R2 ui-attribute', n, n.text);
          else if (TR_CHARS.test(n.text) && !isGuarded(n) && !isMatchingLogic(n) && !isInNonUiCall(ts, n)) add('R3 turkish-literal', n, n.text);
        } else if (ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
          const text = n.getText().slice(1, -1);
          if (TR_CHARS.test(text) && !isGuarded(n) && !isInNonUiCall(ts, n)) add('R3 turkish-literal', n, text);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  for (const k of usedKeys) {
    if (!(k in trFlat)) violations.push({ rule: 'R4 missing-key', file: 'i18n/tr.ts', line: 0, text: k });
    if (!(k in enFlat)) violations.push({ rule: 'R4 missing-key', file: 'i18n/en.ts', line: 0, text: k });
  }
  for (const [k, v] of Object.entries(enFlat)) {
    if (TR_CHARS.test(v) && !EN_DICT_ALLOW.has(k)) violations.push({ rule: 'R5 en-has-turkish', file: 'i18n/en.ts', line: 0, text: `${k} = ${v}` });
  }

  const poolSrc = fs.readFileSync(path.join(root, 'utils/cardPool.ts'), 'utf8');
  const poolIds = [...poolSrc.matchAll(/\bid: '([a-z_0-9]+)'/g)].map(m => m[1]);
  const enIds = new Set([...poolSrc.matchAll(/^\s*'([a-z_0-9]+)': \{ category/gm)].map(m => m[1]));
  for (const id of poolIds) if (!enIds.has(id)) violations.push({ rule: 'R6 cardpool', file: 'utils/cardPool.ts', line: 0, text: `missing English entry for ${id}` });

  const unusedKeys = Object.keys(enFlat).filter(k => !usedKeys.has(k) && ![...dynamicKeyPrefixes].some(p => p && k.startsWith(p)));
  return { violations, unusedKeys, usedKeyCount: usedKeys.size, dictKeyCount: Object.keys(enFlat).length };
}

// Logging / storage / routing calls never reach the UI
function isInNonUiCall(ts, node) {
  for (let n = node; n && n.parent; n = n.parent) {
    const p = n.parent;
    if (ts.isCallExpression(p) && p.arguments.includes(n)) {
      return /^(console\.\w+|logger\.\w+|require|AsyncStorage\.\w+|router\.\w+)$/.test(p.expression.getText());
    }
    if (ts.isBlock(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

module.exports = { audit };

if (require.main === module) {
  const root = path.resolve(path.dirname(require.main.filename), '..');
  const { violations, unusedKeys, usedKeyCount, dictKeyCount } = audit(root);
  for (const v of violations) console.log(`${v.rule.padEnd(18)} ${v.file}${v.line ? `:${v.line}` : ''}  ${v.text}`);
  console.log(`\n${violations.length} violation(s). t() keys used: ${usedKeyCount}/${dictKeyCount}.`);
  console.log(`Possibly unused keys (approximate): ${unusedKeys.length}`);
  if (process.argv.includes('--unused')) unusedKeys.forEach(k => console.log(`  ${k}`));
  process.exitCode = violations.length ? 1 : 0;
}
