import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { t, useI18n } from '../../../i18n';

interface ColorSwatch {
  name: string;
  role: string;
  hex: string;
  rgb: string;
  textDark: boolean;
}

const BRAND_COLORS: ColorSwatch[] = [
  {
    name: 'Esmeralda Habitar (Primario)',
    role: 'Color insignia de la marca. Transmite serenidad, crecimiento y rigor institucional.',
    hex: '#0F6E56',
    rgb: 'rgb(15, 110, 86)',
    textDark: false,
  },
  {
    name: 'Verde Bosque Profundo',
    role: 'Para contrastes jerárquicos, encabezados y fondos oscuros de alto impacto.',
    hex: '#064E3B',
    rgb: 'rgb(6, 78, 59)',
    textDark: false,
  },
  {
    name: 'Menta Suave (Acento)',
    role: 'Superficies secundarias, badges de estado, tarjetas y fondos interactivos.',
    hex: '#E0EFEA',
    rgb: 'rgb(224, 239, 234)',
    textDark: true,
  },
  {
    name: 'Superficie Institucional',
    role: 'Fondo suave optimizado para reducir la fatiga visual en lecturas prolongadas.',
    hex: '#F8FBF9',
    rgb: 'rgb(248, 251, 249)',
    textDark: true,
  },
  {
    name: 'Gris Oscuro de Lectura',
    role: 'Tipografía principal de alto contraste y legibilidad accesible (AAA).',
    hex: '#111827',
    rgb: 'rgb(17, 24, 39)',
    textDark: false,
  },
  {
    name: 'Eje Literal (Comprensión)',
    role: 'Identificador del eje cognitivo de datos explícitos del texto.',
    hex: '#0F6E56',
    rgb: 'rgb(15, 110, 86)',
    textDark: false,
  },
  {
    name: 'Eje Inferencial (Comprensión)',
    role: 'Identificador del eje cognitivo de deducción e interpretación implícita.',
    hex: '#2563EB',
    rgb: 'rgb(37, 99, 235)',
    textDark: false,
  },
  {
    name: 'Eje Crítico (Comprensión)',
    role: 'Identificador del eje cognitivo de juicio de valor y postura argumentada.',
    hex: '#D97706',
    rgb: 'rgb(217, 119, 6)',
    textDark: false,
  },
];

const BOILERPLATES = {
  short: 'Habitar es la plataforma pedagógica de comprensión lectora escolar para los tres ejes cognitivos con acceso seguro por QR.',
  medium:
    'Habitar es una plataforma de tecnología educativa orientada a escuelas primarias y secundarias. ' +
    'Permite a los docentes diseñar y evaluar actividades de comprensión lectora en los ejes literal, inferencial y crítico, ' +
    'conectando aulas físicas mediante códigos QR fijos y garantizando el cumplimiento estricto de la normativa de privacidad de datos estudiantiles.',
  extended:
    'Habitar nace con el propósito de fortalecer la alfabetización y la comprensión lectora en el sistema escolar. ' +
    'Combina un modelo pedagógico estructurado en tres dimensiones cognitivas con herramientas ágiles para el aula: ' +
    'acceso inmediato de alumnos sin requerir cuentas ni contraseñas personales, generación asistida de actividades mediante IA ' +
    'y paneles de analítica grupal para directores y docentes, respetando el interés superior del niño y el marco normativo de la DGCyE.',
};

export function BrandScreen() {
  useI18n();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2500);
  }

  async function downloadSvg(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setCopiedItem(t('Descargando {filename}', { filename }));
      setTimeout(() => setCopiedItem(null), 2000);
    } catch {
      window.open(url, '_blank');
    }
  }

  async function copySvgCode(url: string, label: string) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      navigator.clipboard.writeText(text);
      setCopiedItem(t('Código SVG de {label} copiado', { label }));
      setTimeout(() => setCopiedItem(null), 2500);
    } catch {
      setCopiedItem(t('No se pudo copiar el SVG'));
      setTimeout(() => setCopiedItem(null), 2000);
    }
  }

  async function downloadPngFromSvg(svgUrl: string, filename: string, targetWidth: number, targetHeight: number) {
    try {
      const res = await fetch(svgUrl);
      const svgText = await res.text();
      const img = new Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              const a = document.createElement('a');
              a.download = filename;
              a.href = URL.createObjectURL(pngBlob);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setCopiedItem(t('Descargando {filename}', { filename }));
              setTimeout(() => setCopiedItem(null), 2000);
            }
          }, 'image/png');
        }
        URLObj.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    } catch {
      window.open(svgUrl, '_blank');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FBF9] text-[#1F2937] font-sans selection:bg-[#E0EFEA] selection:text-[#0F6E56]">
      {copiedItem && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#064E3B] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-emerald-500/30">
          <Icon name="check" size={14} className="text-emerald-300" />
          <span>{copiedItem}</span>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo.svg" alt="Habitar" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#111827]">
              Habi<span className="text-[#0F6E56]">tar</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#0F6E56] bg-[#E0EFEA] px-2 py-0.5 rounded-full">
                {t('Brand Kit')}
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="/"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Icon name="arrowLeft" size={13} />
              <span>{t('Volver a la Landing')}</span>
            </a>
            <a
              href="/login"
              className="bg-[#0F6E56] hover:bg-[#084E3D] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Icon name="user" size={12} />
              <span>{t('Ingresar a Habitar')}</span>
            </a>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-white to-[#F8FBF9] border-b border-gray-200 py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F6E56] bg-[#E0EFEA] px-3.5 py-1 rounded-full">
            <Icon name="sparkles" size={14} />
            {t('Identidad Visual & Recursos Oficiales')}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111827] tracking-tight leading-tight">
            {t('Guía de Marca y Recursos Oficiales de Habitar')}
          </h1>

          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t('Los fundamentos visuales, paleta cromática, tono de voz institucional y logotipos vectoriales de Habitar, disponibles para educadores, directivos, prensa y colaboradores escolares.')}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => downloadSvg('/logo.svg', 'Habitar-Isotipo.svg')}
              className="bg-[#0F6E56] hover:bg-[#084E3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Icon name="download" size={14} />
              <span>{t('Descargar Isotipo SVG')}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSvg('/logo-horizontal.svg', 'Habitar-Logo-Horizontal.svg')}
              className="bg-white hover:bg-gray-50 text-[#111827] border border-gray-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Icon name="download" size={14} />
              <span>{t('Descargar Logotipo Horizontal SVG')}</span>
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('1. El Símbolo y Propósito')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('El significado pedagógico detrás de nuestra identidad gráfica.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-36 h-36 mb-4">
                <img src="/logo.svg" alt={t('Isotipo Habitar')} className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#0F6E56]">{t('Isotipo Institucional')}</span>
              <span className="text-sm text-gray-500 mt-1">{t('Libro abierto + Cimientos del Hogar + Chimenea')}</span>
            </div>

            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <div className="bg-[#E0EFEA]/60 border border-[#0F6E56]/20 rounded-xl p-4">
                <span className="font-bold text-[#0F6E56] block mb-1">{t('Misión de Habitar')}</span>
                {t('Hacer que el hábito de la lectura habite en la vida diaria de cada estudiante, transformando la comprensión lectora mediante tecnología que fortalece al docente sin vulnerar la privacidad de las infancias.')}
              </div>

              <p>
                {t('El isotipo fusiona dos conceptos vitales:')}{' '}<strong>{t('el libro abierto')}</strong>{' '}{t('que sostiene los cimientos de la estructura del pensamiento, y')}{' '}<strong>{t('la silueta de la casa con su chimenea')}</strong>{t(', representando calidez, refugio intelectual y el espacio donde habita el conocimiento compartido en el aula.')}
              </p>

              <p>
                {t('El trazo geométrico continuo simboliza la articulación fluida entre la escuela primaria, la secundaria y los tres ejes cognitivos:')}{' '}<strong>{t('Literal')}</strong>, <strong>{t('Inferencial')}</strong>{' '}{t('y')}{' '}<strong>{t('Crítico')}</strong>.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('2. Logotipos y Versiones Oficiales')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('Formatos vectoriales SVG limpios y exportación directa en PNG de alta resolución.')}</p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              {t('SVG 100% Vectorial')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('Isotipo · Fondo Claro')}</span>
                  <span className="text-[11px] font-mono text-[#0F6E56] bg-[#E0EFEA] px-2 py-0.5 rounded font-semibold">256 x 256</span>
                </div>
                <div className="h-44 bg-[#F8FBF9] rounded-xl border border-dashed border-gray-200 flex items-center justify-center p-6 mb-4">
                  <img src="/logo.svg" alt={t('Isotipo Oficial')} className="max-h-full max-w-full object-contain" />
                </div>
                <h3 className="font-bold text-base text-[#111827]">{t('Isotipo Principal')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('Versión para favicons, avatares, apps móviles y sellos escolares.')}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => downloadSvg('/logo.svg', 'Habitar-Isotipo.svg')}
                  className="flex-1 bg-[#0F6E56] hover:bg-[#084E3D] text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="download" size={13} />
                  <span>{t('Descargar SVG')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPngFromSvg('/logo.svg', 'Habitar-Isotipo-1024px.png', 1024, 1024)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="file" size={13} />
                  <span>{t('PNG (1024px)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copySvgCode('/logo.svg', t('Isotipo'))}
                  className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"
                  title={t('Copiar código SVG')}
                >
                  <Icon name="copy" size={14} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('Logotipo Horizontal · Fondo Claro')}</span>
                  <span className="text-[11px] font-mono text-[#0F6E56] bg-[#E0EFEA] px-2 py-0.5 rounded font-semibold">480 x 120</span>
                </div>
                <div className="h-44 bg-[#F8FBF9] rounded-xl border border-dashed border-gray-200 flex items-center justify-center p-6 mb-4">
                  <img src="/logo-horizontal.svg" alt={t('Logotipo Horizontal')} className="max-h-full max-w-full object-contain" />
                </div>
                <h3 className="font-bold text-base text-[#111827]">{t('Logotipo Horizontal Completo')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('Para cabeceras web, papelería institucional, reportes y convenios.')}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => downloadSvg('/logo-horizontal.svg', 'Habitar-Logo-Horizontal.svg')}
                  className="flex-1 bg-[#0F6E56] hover:bg-[#084E3D] text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="download" size={13} />
                  <span>{t('Descargar SVG')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPngFromSvg('/logo-horizontal.svg', 'Habitar-Logo-Horizontal-1920px.png', 1920, 480)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="file" size={13} />
                  <span>{t('PNG (1920px)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copySvgCode('/logo-horizontal.svg', t('Logotipo Horizontal'))}
                  className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors"
                  title={t('Copiar código SVG')}
                >
                  <Icon name="copy" size={14} />
                </button>
              </div>
            </div>

            <div className="bg-[#0F6E56] rounded-2xl border border-emerald-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow text-white">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">{t('Isotipo · Fondo Oscuro')}</span>
                  <span className="text-[11px] font-mono text-white bg-emerald-800/80 px-2 py-0.5 rounded font-semibold">256 x 256</span>
                </div>
                <div className="h-44 bg-[#064E3B] rounded-xl border border-dashed border-emerald-700/50 flex items-center justify-center p-6 mb-4">
                  <img src="/logo-white.svg" alt={t('Isotipo Blanco')} className="max-h-full max-w-full object-contain" />
                </div>
                <h3 className="font-bold text-base text-white">{t('Isotipo Invertido')}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">{t('Para cartelería escolar, proyecciones nocturnas y fondos verdes oscuros.')}</p>
              </div>

              <div className="pt-4 border-t border-emerald-700/60 flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => downloadSvg('/logo-white.svg', 'Habitar-Isotipo-Blanco.svg')}
                  className="flex-1 bg-white hover:bg-emerald-50 text-[#064E3B] text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="download" size={13} />
                  <span>{t('Descargar SVG')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPngFromSvg('/logo-white.svg', 'Habitar-Isotipo-Blanco-1024px.png', 1024, 1024)}
                  className="bg-emerald-900/80 hover:bg-emerald-900 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="file" size={13} />
                  <span>{t('PNG (1024px)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copySvgCode('/logo-white.svg', t('Isotipo Blanco'))}
                  className="p-2 border border-emerald-700 hover:bg-emerald-800 rounded-lg text-emerald-100 transition-colors"
                  title={t('Copiar código SVG')}
                >
                  <Icon name="copy" size={14} />
                </button>
              </div>
            </div>

            <div className="bg-[#064E3B] rounded-2xl border border-emerald-900 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow text-white">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">{t('Logotipo Horizontal · Fondo Oscuro')}</span>
                  <span className="text-[11px] font-mono text-white bg-emerald-900 px-2 py-0.5 rounded font-semibold">480 x 120</span>
                </div>
                <div className="h-44 bg-[#043327] rounded-xl border border-dashed border-emerald-800 flex items-center justify-center p-6 mb-4">
                  <img src="/logo-horizontal-white.svg" alt={t('Logotipo Horizontal Blanco')} className="max-h-full max-w-full object-contain" />
                </div>
                <h3 className="font-bold text-base text-white">{t('Logotipo Horizontal Invertido')}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">{t('Para banners institucionales, pie de página oscuro y presentaciones audiovisuales.')}</p>
              </div>

              <div className="pt-4 border-t border-emerald-800/80 flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => downloadSvg('/logo-horizontal-white.svg', 'Habitar-Logo-Horizontal-Blanco.svg')}
                  className="flex-1 bg-white hover:bg-emerald-50 text-[#064E3B] text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="download" size={13} />
                  <span>{t('Descargar SVG')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPngFromSvg('/logo-horizontal-white.svg', 'Habitar-Logo-Horizontal-Blanco-1920px.png', 1920, 480)}
                  className="bg-emerald-950/80 hover:bg-emerald-950 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Icon name="file" size={13} />
                  <span>{t('PNG (1920px)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copySvgCode('/logo-horizontal-white.svg', t('Logotipo Horizontal Blanco'))}
                  className="p-2 border border-emerald-800 hover:bg-emerald-900 rounded-lg text-emerald-100 transition-colors"
                  title={t('Copiar código SVG')}
                >
                  <Icon name="copy" size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('3. Paleta Cromática Oficial')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('Colores del sistema de diseño. Hacé clic en cualquier muestra para copiar su código HEX.')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BRAND_COLORS.map((color) => (
              <div
                key={color.name}
                onClick={() => copyText(color.hex, t('Color {hex}', { hex: color.hex }))}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div
                  className="h-24 p-3 flex items-end justify-end transition-transform group-hover:scale-105"
                  style={{ backgroundColor: color.hex }}
                >
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm opacity-90 ${
                      color.textDark ? 'bg-black/10 text-gray-900' : 'bg-white/20 text-white'
                    }`}
                  >
                    {t('Copiar')}
                  </span>
                </div>
                <div className="p-4 space-y-1.5">
                  <h4 className="font-bold text-xs text-[#111827] line-clamp-1">{t(color.name)}</h4>
                  <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{t(color.role)}</p>
                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-gray-700">
                    <span className="font-bold">{color.hex}</span>
                    <span className="text-gray-400 text-[10px]">{t(color.rgb)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('4. Tipografía y Estilo de Texto')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('Familia tipográfica oficial orientada a la legibilidad y claridad pedagógica.')}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#0F6E56] uppercase tracking-wider">{t('Familia Tipográfica Primaria')}</span>
                <h3 className="text-xl font-extrabold text-[#111827]">{t('Inter / System Sans-Serif')}</h3>
              </div>
              <button
                type="button"
                onClick={() => copyText(t("font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"), t('CSS Font Family'))}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50"
              >
                {t('Copiar CSS')}
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-gray-400 uppercase">{t('Display · 36px / Bold 800')}</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
                  {t('La lectura como puente pedagógico en las aulas.')}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono text-gray-400 uppercase">{t('Titular H1 · 24px / Bold 700')}</span>
                <div className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {t('Evaluación estructurada en tres ejes cognitivos fundamentales.')}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono text-gray-400 uppercase">{t('Cuerpo de Texto · 15px / Regular 400')}</span>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-3xl">
                  {t('Habitar prioriza una experiencia limpia que reduce la carga cognitiva de estudiantes y educadores. Las fuentes sans-serif de trazo regular garantizan que los textos narrativos e informativos sean leídos con fluidez tanto en dispositivos de pantalla reducida como en proyectores de aula.')}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono text-gray-400 uppercase">{t('Código y Aula QR · 13px / Monospace')}</span>
                <div className="font-mono text-xs text-[#0F6E56] bg-[#F8FBF9] p-3 rounded-lg border border-gray-200 inline-block">
                  {t('AULA-6A-781A · LITERAL / INFERENCIAL / CRITICO')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('5. Tono de Voz y Estilo Editorial')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('Cómo se expresa Habitar hacia la comunidad escolar.')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#E0EFEA] text-[#0F6E56] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-base text-[#111827]">{t('Riguroso pero Accesible')}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('Nos fundamentamos en marcos pedagógicos sólidos de comprensión lectora sin abrumar con terminología tecnológica innecesaria. Hablamos de aulas, lecturas y estudiantes, no de "usuarios y datos".')}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#E0EFEA] text-[#0F6E56] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-base text-[#111827]">{t('Calidez Rioplatense')}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('Utilizamos el voseo natural y respetuoso de la región educativa bonaerense y argentina ("podés", "creá", "mirá"), manteniendo el tono institucional que directivos y familias esperan.')}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#E0EFEA] text-[#0F6E56] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-base text-[#111827]">{t('Ética y Transparencia')}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('Rechazamos las promesas mágicas de la IA. Comunicamos con franqueza que la inteligencia artificial es una herramienta asistiva y que la decisión pedagógica y humana siempre reside en el docente.')}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('6. Uso Correcto de la Marca')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('Buenas prácticas para preservar la consistencia visual del logo.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <Icon name="check" size={16} className="text-emerald-700 dark:text-emerald-400" />
                <span>{t('Usos Recomendados (Do)')}</span>
              </div>
              <ul className="text-xs text-emerald-950 dark:text-emerald-100 space-y-2 leading-relaxed">
                <li>{t('• Mantener un espacio libre perimetral equivalente al 20% del ancho del logotipo.')}</li>
                <li>{t('• Usar la versión blanca sobre fondos oscuros o el color `#0F6E56` sobre fondos claros.')}</li>
                <li>{t('• Asegurar un tamaño mínimo de 24x24 px en pantalla para preservar la legibilidad de la chimenea.')}</li>
                <li>{t('• Citar la marca con inicial mayúscula:')}{' '}<strong>Habitar</strong>{' '}{t('(no HABITAR ni habitar en textos).')}</li>
              </ul>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                <Icon name="alert-circle" size={16} className="text-rose-700 dark:text-rose-400" />
                <span>{t('Usos Incorrectos (Don\'t)')}</span>
              </div>
              <ul className="text-xs text-rose-950 dark:text-rose-100 space-y-2 leading-relaxed">
                <li>{t('• No distorsionar, rotar ni estirar las proporciones del isotipo.')}</li>
                <li>{t('• No alterar los colores esmeralda oficiales por tonos no autorizados.')}</li>
                <li>{t('• No aplicar sombras paralelas pronunciadas, brillos 3D ni degradados estridentes.')}</li>
                <li>{t('• No encasillar el símbolo dentro de formas geométricas rígidas que asfixien su silueta.')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{t('7. Textos Institucionales para Medios')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('Descripciones estandarizadas listas para copiar en gacetillas, programas y convenios.')}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F6E56] uppercase tracking-wider">{t('Versión Corta (1 Línea)')}</span>
                <button
                  type="button"
                  onClick={() => copyText(t(BOILERPLATES.short), t('Descripción corta'))}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1 rounded border border-gray-200 flex items-center gap-1"
                >
                  <Icon name="copy" size={12} />
                  <span>{t('Copiar')}</span>
                </button>
              </div>
              <p className="text-sm text-gray-800 italic">"{t(BOILERPLATES.short)}"</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F6E56] uppercase tracking-wider">{t('Versión Mediana (1 Párrafo para Prensa)')}</span>
                <button
                  type="button"
                  onClick={() => copyText(t(BOILERPLATES.medium), t('Descripción mediana'))}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1 rounded border border-gray-200 flex items-center gap-1"
                >
                  <Icon name="copy" size={12} />
                  <span>{t('Copiar')}</span>
                </button>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed italic">"{t(BOILERPLATES.medium)}"</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F6E56] uppercase tracking-wider">{t('Versión Extendida (Proyectos y Convenios)')}</span>
                <button
                  type="button"
                  onClick={() => copyText(t(BOILERPLATES.extended), t('Descripción extendida'))}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1 rounded border border-gray-200 flex items-center gap-1"
                >
                  <Icon name="copy" size={12} />
                  <span>{t('Copiar')}</span>
                </button>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed italic">"{t(BOILERPLATES.extended)}"</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-10 px-4 sm:px-6 mt-16 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#111827]">
            <img src="/logo.svg" alt="Habitar" className="w-5 h-5" />
            <span>Habitar</span>
          </div>
          <p>
            {t('Kit de Medios y Manual de Estilo de Habitar · Todos los activos vectoriales y marcas registradas son de uso institucional para comunidades escolares.')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[#0F6E56]">
            <a href="/" className="hover:underline">{t('Landing Principal')}</a>
            <span>·</span>
            <a href="/privacidad" className="hover:underline">{t('Privacidad & PBA')}</a>
            <span>·</span>
            <a href="/consentimiento" className="hover:underline">{t('Consentimiento Escolar')}</a>
            <span>·</span>
            <a href="/status" className="hover:underline">{t('Estado del Sistema')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
