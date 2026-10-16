import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import api from '@/services/api';

const SESSION_KEY = 'nicepricebazar-traffic-session';

function sessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const value = typeof window.crypto?.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
        const random = Math.floor(Math.random() * 16);
        return (token === 'x' ? random : (random & 0x3) | 0x8).toString(16);
      });
  window.sessionStorage.setItem(SESSION_KEY, value);
  return value;
}

export function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      void api.post('/traffic/visit', {
        sessionId: sessionId(),
        path: pathname || '/',
        referrer: document.referrer || undefined,
      }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
