import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { ApiError } from '../../../lib/apiClient';
import { getOrCreateDeviceId } from '../../../lib/studentDevice';
import { askReadingHelp, getHelpConversation, type HelpMessage } from '../../../services/activityService';
import { t, useI18n } from '../../../i18n';

interface ReadingHelpChatProps {
  code: string;
  studentName: string;
  selection: string | null;
  onSelectionUsed: () => void;
}

const SUGGESTIONS = ['¿Qué significa…?', '¿A quién se refiere «ellos»?', 'Explicame esta oración con palabras simples:'];

export function ReadingHelpChat({ code, studentName, selection, onSelectionUsed }: ReadingHelpChatProps) {
  useI18n();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    getHelpConversation(code, studentName, getOrCreateDeviceId())
      .then((c) => {
        setMessages(c.messages);
        setRemaining(c.remaining);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [open, loaded, code, studentName]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text: string) {
    const question = text.trim().slice(0, 300);
    if (question.length < 2 || pending) return;
    setError(null);
    setPending(question);
    setDraft('');
    try {
      const result = await askReadingHelp(code, studentName, getOrCreateDeviceId(), question);
      setMessages((prev) => [...prev, result.message]);
      setRemaining(result.remaining);
    } catch (err) {
      setDraft(question);
      setError(err instanceof ApiError ? err.message : t('No hay conexión. Probá de nuevo en un momento.'));
    } finally {
      setPending(null);
    }
  }

  function askSelection() {
    if (!selection) return;
    setOpen(true);
    void send(t('¿Qué significa «{selection}»?', { selection }));
    onSelectionUsed();
  }

  const exhausted = remaining === 0;

  return (
    <>
      {!open && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          {selection && (
            <button
              type="button"
              onClick={askSelection}
              className="max-w-[260px] truncate bg-white dark:bg-[#202533] border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold px-3.5 py-2 rounded-full shadow-md cursor-pointer"
            >
              {t('¿Qué significa «{selection}»?', { selection })}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold pl-3.5 pr-4 py-3 rounded-full shadow-lg cursor-pointer"
            aria-label={t('Abrir ayuda con el texto')}
          >
            <Icon name="messageCircle" size={16} />
            {t('¿No entendés algo del texto?')}
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px] h-[min(75vh,560px)] bg-white dark:bg-[#161A23] border border-stone-200 dark:border-[#2D3342] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label={t('Ayuda con el texto')}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 dark:border-[#2D3342] bg-stone-50 dark:bg-[#1A1E29]">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{t('Ayuda con el texto')}</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                {t('Te explico palabras y frases. Las respuestas de la actividad son tuyas.')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('Cerrar ayuda')}
              className="text-stone-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {loaded && messages.length === 0 && !pending && (
              <div className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed space-y-2">
                <p>
                  {t('Preguntame qué significa una palabra o una expresión, a quién se refiere algo, o pedime que te explique una oración con palabras más simples. También podés seleccionar una palabra en el texto.')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setDraft(s.endsWith('…?') ? t('¿Qué significa ') : s.endsWith(':') ? `${t(s)} ` : t(s));
                        inputRef.current?.focus();
                      }}
                      className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 cursor-pointer"
                    >
                      {t(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="space-y-1.5">
                <Bubble mine>{m.question}</Bubble>
                <Bubble declined={m.declined}>{m.answer}</Bubble>
              </div>
            ))}
            {pending && (
              <div className="space-y-1.5">
                <Bubble mine>{pending}</Bubble>
                <div className="flex gap-1 px-3 py-2.5 w-fit rounded-2xl rounded-bl-md bg-stone-100 dark:bg-stone-800" aria-label={t('Pensando')}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-stone-400 motion-safe:animate-bounce"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="border-t border-stone-200 dark:border-[#2D3342] p-3 space-y-1.5"
          >
            {error && <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 300))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                rows={1}
                disabled={exhausted}
                placeholder={exhausted ? t('Ya usaste todas las consultas') : t('¿Qué no entendiste?')}
                className="flex-1 resize-none max-h-24 px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm bg-stone-50 dark:bg-[#202533] text-slate-900 dark:text-white focus:border-emerald-600 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={draft.trim().length < 2 || Boolean(pending) || exhausted}
                aria-label={t('Enviar duda')}
                className="shrink-0 w-10 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                <Icon name="send" size={15} />
              </button>
            </div>
            {remaining !== null && (
              <div className="text-[10.5px] text-stone-400 tabular-nums">
                {remaining === 1 ? t('Te queda 1 consulta') : t('Te quedan {remaining} consultas', { remaining })}{' '}{t('en esta actividad')}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ children, mine, declined }: { children: React.ReactNode; mine?: boolean; declined?: boolean }) {
  useI18n();
  return (
    <div
      className={`text-[13px] leading-relaxed px-3 py-2 rounded-2xl max-w-[85%] whitespace-pre-line ${
        mine
          ? 'ml-auto rounded-br-md bg-emerald-700 text-white'
          : declined
            ? 'rounded-bl-md bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-200 dark:border-amber-800'
            : 'rounded-bl-md bg-stone-100 dark:bg-stone-800 text-slate-800 dark:text-stone-100'
      }`}
    >
      {children}
    </div>
  );
}
