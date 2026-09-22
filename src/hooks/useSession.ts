import { useStore } from '@nanostores/react';
import { sessionStore } from '../store/sessionStore';

export function useSession() {
  return useStore(sessionStore);
}
