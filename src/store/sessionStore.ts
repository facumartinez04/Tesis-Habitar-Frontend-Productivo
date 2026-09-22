import { persistentAtom } from '@nanostores/persistent';
import type { Session } from '../types/auth';

export const sessionStore = persistentAtom<Session | null>('habitar-session', null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function clearSession(): void {
  sessionStore.set(null);
}
