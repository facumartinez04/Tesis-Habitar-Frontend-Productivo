import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { t, useI18n } from '../../../i18n';

interface QrBoxProps {
  code: string;
  size?: 'sm' | 'lg';
}

export function QrBox({ code, size = 'sm' }: QrBoxProps) {
  useI18n();
  const isLg = size === 'lg';
  const boxWidth = isLg ? 240 : 160;
  const qrSize = isLg ? 190 : 120;
  const codeSize = isLg ? 'text-2xl' : 'text-base';

  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const joinUrl = `${window.location.origin}/actividad?code=${encodeURIComponent(code)}`;
    QRCode.toDataURL(joinUrl, { margin: 1, width: qrSize * 3, color: { dark: '#1A1918', light: '#FFFFFF' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [code, qrSize]);

  return (
    <div
      data-keep-white="true"
      className="bg-white text-neutral-900 border-2 border-gray-border rounded-xl flex flex-col items-center justify-center p-4 shadow-sm mx-auto"
      style={{ width: boxWidth }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={t('Código QR para acceder a la actividad {code}', { code })}
          style={{ width: qrSize, height: qrSize }}
          className="rounded"
        />
      ) : (
        <div className="bg-gray-100 animate-pulse rounded" style={{ width: qrSize, height: qrSize }} />
      )}
      <div className={`font-mono ${codeSize} font-bold tracking-[.15em] text-neutral-900 mt-3 text-center select-all`}>
        {code}
      </div>
    </div>
  );
}
