import { getLocale, translate } from './index';

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'] as const;

export function translateDocument(root: ParentNode = document): void {
  const locale = getLocale();
  document.documentElement.lang = locale;

  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = translate(locale, key);
  });

  for (const attr of ATTRS) {
    root.querySelectorAll<HTMLElement>(`[data-i18n-${attr}]`).forEach((el) => {
      const key = el.getAttribute(`data-i18n-${attr}`);
      if (key) el.setAttribute(attr, translate(locale, key));
    });
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="habitar-page-title"]');
  if (meta?.content) {
    const title = translate(locale, meta.content);
    document.title = title.startsWith('Habitar') ? title : `Habitar — ${title}`;
  }
}
