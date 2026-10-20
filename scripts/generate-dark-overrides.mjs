import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(SRC, 'styles', 'dark-overrides.css');

const FAMILIES = {
  emerald: ['16, 185, 129', '#6EE7B7'], green: ['34, 197, 94', '#86EFAC'], teal: ['20, 184, 166', '#5EEAD4'],
  amber: ['245, 158, 11', '#FCD34D'], yellow: ['234, 179, 8', '#FDE047'], orange: ['249, 115, 22', '#FDBA74'],
  red: ['239, 68, 68', '#FCA5A5'], rose: ['244, 63, 94', '#FDA4AF'], pink: ['236, 72, 153', '#F9A8D4'],
  blue: ['59, 130, 246', '#93C5FD'], sky: ['14, 165, 233', '#7DD3FC'], cyan: ['6, 182, 212', '#67E8F9'],
  indigo: ['99, 102, 241', '#A5B4FC'], violet: ['139, 92, 246', '#C4B5FD'], purple: ['168, 85, 247', '#D8B4FE'],
  fuchsia: ['217, 70, 239', '#F0ABFC'], lime: ['132, 204, 22', '#BEF264'],
};
const NEUTRALS = ['gray', 'stone', 'slate', 'zinc', 'neutral'];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|astro|ts)$/.test(name)) files.push(p);
  }
})(SRC);

const TOKEN = /(?<![\w:-])((?:hover:|group-hover:|focus:)?)(bg|text|border|ring|divide)-([a-z]+)-(\d{2,3})(?:\/(\d{1,3}))?(?![\w-])/g;
const tokens = new Map();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(TOKEN)) {
    if (src.slice(Math.max(0, m.index - 5), m.index) === 'dark:') continue;
    tokens.set(m[0], { variant: m[1], prop: m[2], family: m[3], shade: Number(m[4]), opacity: m[5] ? Number(m[5]) / 100 : 1 });
  }
}

const esc = (cls) => cls.replace(/([:/.])/g, '\\$1');

function darkValue({ prop, family, shade, opacity }) {
  const neutral = NEUTRALS.includes(family);
  const fam = FAMILIES[family];
  if (!neutral && !fam) return null;
  if (prop === 'bg') {
    if (shade > 300) return null;
    if (neutral) return `rgba(255, 255, 255, ${({ 50: 0.04, 100: 0.07, 200: 0.1, 300: 0.14 }[shade] ?? 0.07) * opacity})`;
    const alpha = ({ 50: 0.1, 100: 0.16, 200: 0.22, 300: 0.3 }[shade] ?? 0.16) * opacity;
    return `rgba(${fam[0]}, ${Math.max(alpha, 0.06).toFixed(3)})`;
  }
  if (prop === 'text') {
    if (shade < 500) return null;
    if (neutral) return shade >= 800 ? '#F3F4F6' : shade >= 700 ? '#E5E7EB' : shade >= 600 ? '#D1D5DB' : '#9CA3AF';
    return fam[1];
  }
  if (prop === 'border' || prop === 'divide' || prop === 'ring') {
    if (shade > 400) return null;
    if (neutral) return '#2D3342';
    return `rgba(${fam[0]}, 0.35)`;
  }
  return null;
}

const ROOTS = ['html.dark', ':root[data-theme="dark"]'];
const rules = [];
for (const [cls, t] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
  const value = darkValue(t);
  if (!value) continue;
  const darkPrefix = `dark:${t.variant}${t.prop === 'divide' ? 'divide' : t.prop}-`;
  const notOwnDark = `:not([class*="${darkPrefix}"]):not([data-keep-white]):not([data-keep-white] *)`;
  const state = t.variant === 'hover:' ? ':hover' : t.variant === 'focus:' ? ':focus' : '';
  let selectors;
  if (t.prop === 'divide') {
    selectors = ROOTS.map((r) => `${r} .${esc(cls)}${notOwnDark} > :not(:last-child)`);
  } else if (t.variant === 'group-hover:') {
    selectors = ROOTS.map((r) => `${r} .group:hover .${esc(cls)}${notOwnDark}`);
  } else {
    selectors = ROOTS.map((r) => `${r} .${esc(cls)}${notOwnDark}${state}`);
  }
  const decl =
    t.prop === 'bg' ? `background-color: ${value} !important;`
      : t.prop === 'text' ? `color: ${value} !important;`
        : t.prop === 'ring' ? `--tw-ring-color: ${value} !important;`
          : `border-color: ${value} !important;`;
  rules.push(`${selectors.join(',\n')} {\n  ${decl}\n}`);
}

writeFileSync(OUT, rules.join('\n\n') + '\n');
console.log(`[dark] ${rules.length} reglas de modo oscuro para ${tokens.size} clases de color → src/styles/dark-overrides.css`);
