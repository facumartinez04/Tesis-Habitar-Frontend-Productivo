import { t, useI18n, type TranslateParams } from './index';

export function T({ k, p }: { k: string; p?: TranslateParams }) {
  useI18n();
  return <>{t(k, p)}</>;
}
