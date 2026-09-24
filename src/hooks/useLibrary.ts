import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { native } from '../services/native';
import { suggestCategory } from '../services/categories';
import type { PermissionState, ScanProgress, Screenshot } from '../types';
export function useLibrary() {
  const [items, setItems] = useState<Screenshot[]>([]);
  const [permission, setPermission] = useState<PermissionState>('denied');
  const [progress, setProgress] = useState<ScanProgress>({
    done: 0,
    total: 0,
    running: false,
  });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const cancel = useRef(false);
  const running = useRef(false);
  const hashRunning = useRef(false);
  const initialized = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const p = await native.permission();
      setPermission(p);
      setItems(await native.list());
      setError('');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);
  const indexDuplicates = useCallback(async () => {
    if (hashRunning.current) return;
    hashRunning.current = true;
    try {
      const list = await native.list();
      for (const item of list) {
        if (cancel.current) break;
        if (item.hash && item.visualHash) continue;
        try {
          const [hash, visualHash] = await Promise.all([
            native.hash(item.uri),
            native.visualHash(item.uri),
          ]);
          if (cancel.current) break;
          await native.setHashes(item.id, hash, visualHash);
        } catch {
          /* inaccessible images are skipped */
        }
      }
      await refresh();
    } finally {
      hashRunning.current = false;
    }
  }, [refresh]);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let active = true;
    (async () => {
      try {
        if (
          (await native.permission()) === 'denied' &&
          !(await native.permissionPrompted())
        )
          await native.requestPermission();
        if (active) {
          await refresh();
          void indexDuplicates();
        }
      } catch (e) {
        if (active) setError(String(e));
        setBusy(false);
      }
    })();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && active) void refresh();
    });
    return () => {
      active = false;
      cancel.current = true;
      sub.remove();
    };
  }, [refresh, indexDuplicates]);
  const request = async () => {
    try {
      setPermission(await native.requestPermission());
      await refresh();
      void indexDuplicates();
    } catch (e) {
      setError(String(e));
    }
  };
  const pick = async () => {
    try {
      await native.pick();
      await refresh();
      void indexDuplicates();
    } catch (e) {
      setError(String(e));
    }
  };
  const scan = async () => {
    if (running.current) return;
    running.current = true;
    cancel.current = false;
    try {
      const all = await native.list();
      const pending = all.filter(x => x.status !== 'indexed');
      setProgress({ done: 0, total: pending.length, running: true });
      for (let i = 0; i < pending.length; i++) {
        if (cancel.current) break;
        const item = pending[i];
        try {
          const text = await native.recognize(item.uri);
          if (cancel.current) break;
          await native.setIndex(
            item.id,
            text,
            suggestCategory(text),
            item.hash,
            '',
          );
        } catch (e) {
          await native.setIndex(item.id, '', '', item.hash, String(e));
        }
        setProgress({ done: i + 1, total: pending.length, running: true });
      }
      await refresh();
      void indexDuplicates();
    } catch (e) {
      setError(String(e));
    } finally {
      running.current = false;
      setProgress(p => ({ ...p, running: false }));
    }
  };
  const favorite = async (item: Screenshot) => {
    await native.setFavorite(item.id, !item.favorite);
    await refresh();
  };
  const category = async (item: Screenshot, value: string) => {
    await native.setCategory(item.id, value);
    await refresh();
  };
  const remove = async (item: Screenshot) => {
    const deleted = await native.delete(item.uri);
    if (deleted) await refresh();
    return deleted;
  };
  return {
    items,
    permission,
    progress,
    busy,
    error,
    refresh,
    request,
    pick,
    scan,
    indexDuplicates,
    cancel: () => {
      cancel.current = true;
    },
    favorite,
    category,
    remove,
    setError,
  };
}
export type LibraryController = ReturnType<typeof useLibrary>;
