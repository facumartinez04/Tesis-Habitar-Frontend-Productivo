import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrBoxProps {
  code: string;
  size?: 'sm' | 'lg';
}

export function QrBox({ code, size = 'sm' }: QrBoxProps) {
  const boxSize = size === 'lg' ? 190 : 132;
  const gridSize = size === 'lg' ? 140 : 100;
  const codeSize = size === 'lg' ? 'text-[28px]' : 'text-[22px]';

  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const joinUrl = `${window.location.origin}/actividad?code=${encodeURIComponent(code)}`;
    QRCode.toDataURL(joinUrl, { margin: 0, width: gridSize * 4, color: { dark: '#1A1918', light: '#FFFFFF' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [code, gridSize]);

  return (
    <div
      className="bg-white border-2 border-gray-border rounded-md flex flex-col items-center justify-center p-3.5"
      style={{ width: boxSize, height: boxSize }}
    >
      {dataUrl ? (
        <img src={dataUrl} alt={`Código QR para acceder a la actividad ${code}`} style={{ width: gridSize, height: gridSize }} />
      ) : (
        <div className="bg-gray-100 animate-pulse rounded-[1px]" style={{ width: gridSize, height: gridSize }} />
      )}
      <div className={`font-mono ${codeSize} font-medium tracking-[.14em] mt-2.5`}>{code}</div>
    </div>
  );
}
