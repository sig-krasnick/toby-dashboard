import { useState, useEffect, useRef, useCallback } from 'react';
import { getWindows, openWindow, isExtensionAvailable } from '../api/extension';

export function useOpenTabs(enabled) {
  const [windows, setWindows] = useState([]);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchTabs = useCallback(async () => {
    try {
      const res = await getWindows();
      setWindows(res.windows);
      setExtensionConnected(true);
      setError(null);
    } catch (err) {
      setExtensionConnected(false);
      setWindows([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check extension availability on mount
  useEffect(() => {
    let cancelled = false;
    isExtensionAvailable().then((available) => {
      if (!cancelled) {
        setExtensionConnected(available);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Poll when enabled and connected
  useEffect(() => {
    if (enabled && extensionConnected) {
      fetchTabs();
      intervalRef.current = setInterval(fetchTabs, 2000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [enabled, extensionConnected, fetchTabs]);

  const openAsWindow = useCallback(async (urls) => {
    try {
      await openWindow(urls);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const recheckExtension = useCallback(async () => {
    const available = await isExtensionAvailable();
    setExtensionConnected(available);
  }, []);

  return { windows, extensionConnected, loading, error, fetchTabs, openAsWindow, recheckExtension };
}
