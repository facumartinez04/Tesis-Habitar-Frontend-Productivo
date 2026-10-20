interface StudentNameFieldsProps {
  firstName: string;
  lastName: string;
  onChange: (value: { firstName: string; lastName: string }) => void;
  inputClassName: string;
  autoFocus?: boolean;
}

const LETTERS = /^[\p{L}][\p{L}'’\- ]*$/u;

export function studentNameError(firstName: string, lastName: string): string | null {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first || !last) return 'Completá tu nombre y tu apellido.';
  if (first.length < 2 || last.length < 2) return 'El nombre y el apellido tienen que tener al menos 2 letras.';
  if (!LETTERS.test(first) || !LETTERS.test(last)) return 'Usá sólo letras en el nombre y el apellido.';
  return null;
}

export function fullStudentName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-AR')
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('es-AR'));
}

export function splitStudentName(full: string): { firstName: string; lastName: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { firstName: words[0] ?? '', lastName: '' };
  return { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] };
}

export function StudentNameFields({ firstName, lastName, onChange, inputClassName, autoFocus }: StudentNameFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-left">
        <span className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Nombre</span>
        <input
          value={firstName}
          onChange={(e) => onChange({ firstName: e.target.value, lastName })}
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          placeholder="Ej: Mateo"
          className={inputClassName}
          autoFocus={autoFocus}
        />
      </label>
      <label className="block text-left">
        <span className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Apellido</span>
        <input
          value={lastName}
          onChange={(e) => onChange({ firstName, lastName: e.target.value })}
          autoComplete="family-name"
          autoCapitalize="words"
          maxLength={40}
          placeholder="Ej: González"
          className={inputClassName}
        />
      </label>
    </div>
  );
}
