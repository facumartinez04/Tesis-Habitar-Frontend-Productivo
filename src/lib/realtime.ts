/**
 * Cliente de tiempo real (Socket.IO). El servidor sólo avisa que algo cambió; la pantalla vuelve a pedir los datos
 * por la API. Si el WebSocket no conecta, las pantallas siguen funcionando: cada una tiene además un refresco lento.
 */
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { sessionStore } from '../store/sessionStore';

const API_URL =
  import.meta.env.PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://api.habitar.lat/api'
    : 'http://localhost:4000/api');

let socketPromise: Promise<Socket> | null = null;

function getSocket(): Promise<Socket> {
  if (!socketPromise) {
    socketPromise = import('socket.io-client').then(({ io }) =>
      io(new URL(API_URL).origin, { path: '/realtime', transports: ['websocket', 'polling'] }),
    );
  }
  return socketPromise;
}

type Subscription =
  | { kind: 'course'; qrCode: string }
  | { kind: 'activity'; code: string }
  | { kind: 'live'; activityId: string };

const EVENTS = { course: 'course:changed', activity: 'activity:changed', live: 'live:changed' } as const;

/**
 * Se suscribe a una sala y llama a `onChange` cada vez que el servidor avisa un cambio. Devuelve si el canal en
 * vivo está conectado, para mostrarlo en pantalla. Al reconectar, vuelve a unirse a la sala y refresca una vez.
 */
export function useLiveUpdates(subscription: Subscription | null, onChange: (payload?: { status?: string }) => void): boolean {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onChange);
  handler.current = onChange;
  const key = subscription ? JSON.stringify(subscription) : '';

  useEffect(() => {
    if (!subscription) return;
    let socket: Socket | null = null;
    let cancelled = false;
    const event = EVENTS[subscription.kind];
    const onEvent = (payload?: { status?: string }) => handler.current(payload);

    const join = () => {
      if (!socket) return;
      const payload =
        subscription.kind === 'course'
          ? ['watch:course', { qrCode: subscription.qrCode }]
          : subscription.kind === 'activity'
            ? ['watch:activity', { code: subscription.code }]
            : ['watch:live', { activityId: subscription.activityId, token: sessionStore.get()?.token ?? '' }];
      socket.emit(payload[0] as string, payload[1], (ack: { ok: boolean }) => {
        if (!cancelled) setConnected(Boolean(ack?.ok));
      });
    };
    const onConnect = () => {
      join();
      handler.current();
    };
    const onDisconnect = () => !cancelled && setConnected(false);

    getSocket().then((s) => {
      if (cancelled) return;
      socket = s;
      s.on(event, onEvent);
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      if (s.connected) join();
    });

    return () => {
      cancelled = true;
      socket?.off(event, onEvent);
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
    };
  }, [key]);

  return connected;
}

/** Refresco lento de respaldo por si el WebSocket no conecta (redes escolares con proxies restrictivos). */
export function usePolling(callback: () => void, intervalMs: number, enabled = true): void {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => saved.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
