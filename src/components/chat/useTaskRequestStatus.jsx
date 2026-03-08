import { useState, useEffect, useRef } from "react";
import { TaskRequest } from "@/entities/TaskRequest";

// Global cache: requestId -> { status, fetchedAt }
const _cache = {};
const _pending = {}; // requestId -> Promise

/**
 * Hook that fetches and caches a TaskRequest status by ID.
 * Returns: { status: "pending"|"approved"|"rejected"|null, loading: boolean }
 * - status null = not found / no id
 * - Caches for 60 seconds to avoid redundant fetches
 */
export function useTaskRequestStatus(requestId, overrideStatus = null) {
  const [status, setStatus] = useState(() => {
    if (overrideStatus) return overrideStatus;
    if (requestId && _cache[requestId]) return _cache[requestId].status;
    return null;
  });
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // If an override is provided (from parent post-approval), use it immediately
  useEffect(() => {
    if (overrideStatus !== null && overrideStatus !== undefined) {
      setStatus(overrideStatus);
      if (requestId) _cache[requestId] = { status: overrideStatus, fetchedAt: Date.now() };
    }
  }, [overrideStatus, requestId]);

  useEffect(() => {
    if (!requestId) return;
    if (overrideStatus !== null && overrideStatus !== undefined) return;

    // Check cache (valid for 60s)
    const cached = _cache[requestId];
    if (cached && Date.now() - cached.fetchedAt < 60000) {
      setStatus(cached.status);
      return;
    }

    // Deduplicate concurrent fetches for the same id
    if (!_pending[requestId]) {
      _pending[requestId] = TaskRequest.filter({ id: requestId })
        .catch(() => [])
        .then(results => {
          const found = results?.[0];
          const s = found ? found.status : "pending";
          _cache[requestId] = { status: s, fetchedAt: Date.now() };
          delete _pending[requestId];
          return s;
        });
    }

    setLoading(true);
    _pending[requestId].then(s => {
      if (mountedRef.current) {
        setStatus(s);
        setLoading(false);
      }
    });
  }, [requestId, overrideStatus]);

  return { status, loading };
}

/** Call this to immediately update the cache after approval/rejection */
export function invalidateTaskRequestCache(requestId, newStatus) {
  if (requestId) {
    _cache[requestId] = { status: newStatus, fetchedAt: Date.now() };
  }
}