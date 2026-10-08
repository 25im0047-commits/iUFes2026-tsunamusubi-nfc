import { isRallyComplete, type Progress } from "./rally.ts";
export const PRIZE_STORAGE_KEY = "iufes2026-prize-receipt-v1";
type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export type PrizeState = { received: boolean; error: boolean };
function storage(store?: Store) { return store ?? (typeof window !== "undefined" ? window.localStorage : undefined); }
export function readPrizeState(store?: Store): PrizeState {
  try {
    const target = storage(store);
    if (!target) return { received: false, error: true };
    const raw = target.getItem(PRIZE_STORAGE_KEY);
    if (raw === null) return { received: false, error: false };
    const receipt = JSON.parse(raw);
    if (receipt.version !== 1 || receipt.received !== true || typeof receipt.receivedAt !== "string" || !Number.isFinite(Date.parse(receipt.receivedAt)))
      return { received: false, error: true };
    return { received: true, error: false };
  } catch { return { received: false, error: true }; }
}
export function receivePrize(progress: Progress, store?: Store): PrizeState {
  if (!isRallyComplete(progress)) return { received: false, error: true };
  const current = readPrizeState(store);
  if (current.received || current.error) return current;
  try {
    const target = storage(store)!;
    target.setItem(PRIZE_STORAGE_KEY, JSON.stringify({ version: 1, received: true, receivedAt: new Date().toISOString() }));
    return readPrizeState(target);
  } catch { return { received: false, error: true }; }
}
