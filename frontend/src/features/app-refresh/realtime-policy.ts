export const REALTIME_CHANGE_DEBOUNCE_MS = 500;
export const REALTIME_FALLBACK_REFRESH_INTERVAL_MS = 120_000;
export const REALTIME_MAX_RECONNECT_DELAY_MS = 30_000;

export function realtimeReconnectDelay(
  attempt: number,
  randomValue = Math.random(),
): number {
  const exponentialDelay = Math.min(
    REALTIME_MAX_RECONNECT_DELAY_MS,
    1_000 * 2 ** Math.min(Math.max(0, attempt), 5),
  );
  const jitter = 0.75 + Math.min(1, Math.max(0, randomValue)) * 0.5;
  return Math.min(
    REALTIME_MAX_RECONNECT_DELAY_MS,
    Math.round(exponentialDelay * jitter),
  );
}
