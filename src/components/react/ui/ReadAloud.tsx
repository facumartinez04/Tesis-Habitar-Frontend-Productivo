import { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface ReadAloudProps {
  /** Texto a leer en voz alta. */
  text: string;
  label?: string;
  className?: string;
}

/** Voz en español del navegador, preferentemente rioplatense. */
function spanishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'es-AR') ??
    voices.find((v) => v.lang === 'es-419' || v.lang === 'es-US' || v.lang === 'es-MX') ??
    voices.find((v) => v.lang.startsWith('es')) ??
    null
  );
}

/** Lee el texto en voz alta con la voz del navegador (sin servicios externos ni costo). */
export function ReadAloud({ text, label = 'Escuchar', className = '' }: ReadAloudProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Si cambia el texto (otra pregunta), se corta lo que se estaba leyendo.
  useEffect(() => {
    if (supported && speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!supported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-AR';
    const voice = spanishVoice();
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
        speaking
          ? 'bg-emerald-700 border-emerald-700 text-white'
          : 'border-stone-200 dark:border-stone-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
      } ${className}`}
    >
      <Icon name={speaking ? 'close' : 'volume'} size={13} />
      {speaking ? 'Detener' : label}
    </button>
  );
}
