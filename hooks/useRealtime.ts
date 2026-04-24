'use client';
import { useEffect, useRef, useCallback } from 'react';
import { subscribeTables } from '@/utils/broadcast';

type Action = 'INSERT' | 'UPDATE' | 'DELETE';

interface Options {
  tables: string[];
  onInsert?: (table: string, id: string) => void;
  onUpdate?: (table: string, id: string) => void;
  onDelete?: (table: string, id: string) => void;
  onChange?: (table: string, action: Action, id: string) => void;
  enabled?: boolean;
}

export function useRealtime({
  tables,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: Options) {
  const cb = useRef({ onInsert, onUpdate, onDelete, onChange });
  cb.current = { onInsert, onUpdate, onDelete, onChange };

  const tablesKey = tables.join(',');

  const connect = useCallback((): EventSource | null => {
    if (!enabled || typeof window === 'undefined') return null;

    const es = new EventSource('/api/events');

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'change') return;
        const { table, action, id } = data as { table: string; action: Action; id: string };
        if (!tables.includes(table)) return;

        cb.current.onChange?.(table, action, id);
        if (action === 'INSERT') cb.current.onInsert?.(table, id);
        else if (action === 'UPDATE') cb.current.onUpdate?.(table, id);
        else if (action === 'DELETE') cb.current.onDelete?.(table, id);
      } catch {}
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => connect(), 3000);
    };

    return es;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, enabled]);

  useEffect(() => {
    const es = connect();
    return () => es?.close();
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeTables(tables, (t) => cb.current.onUpdate?.(t, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, enabled]);
}
