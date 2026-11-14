'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { get } from '@/lib/api';

/** Real vaqtli chat/bildirishnoma: WebSocket. Uzilsa avtomatik qayta ulanadi. */
export function useRealtime(enabled: boolean, onEvent?: (e: any) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let ws: WebSocket | null = null; let timer: any; let stop = false; let tries = 0;
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || '';
    const connect = async () => {
      let url = wsBase ? `${wsBase}/api/v1/ws` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/v1/ws`;
      if (wsBase) {
        try { const t = await get('/auth/ws-token'); url += `?token=${encodeURIComponent(t.token)}`; } catch { if (!stop) timer = setTimeout(connect, 5000); return; }
      }
      if (stop) return;
      ws = new WebSocket(url);
      ws.onopen = () => { tries = 0; };
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.type === 'message' || d.type === 'read') { qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['messages'] }); }
          if (d.type === 'notification') { qc.invalidateQueries({ queryKey: ['notifications'] }); }
          onEvent?.(d);
        } catch {}
      };
      ws.onclose = () => { if (!stop) timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** tries++)); };
    };
    connect();
    const ping = setInterval(() => { try { ws?.readyState === 1 && ws.send('ping'); } catch {} }, 25000);
    return () => { stop = true; clearTimeout(timer); clearInterval(ping); ws?.close(); };
  }, [enabled]); // eslint-disable-line
}
