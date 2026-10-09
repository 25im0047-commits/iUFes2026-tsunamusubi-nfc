import { LEGACY_STORAGE_KEY, PREVIOUS_STORAGE_KEY, STORAGE_KEY } from "./rally.ts";
import { PARTICIPANT_STORAGE_KEY } from "./participant.ts";
import { PRIZE_STORAGE_KEY } from "./prize.ts";
export const RESET_STORAGE_KEY="iufes2026-progress-reset-v1";
// Remove migration sources before the active key, preventing old stamps from reappearing.
export const RESETTABLE_KEYS=[LEGACY_STORAGE_KEY,PREVIOUS_STORAGE_KEY,
  "iufes2026-survey-draft-v1-bad-01","iufes2026-survey-draft-v1-bad-02",
  "iufes2026-survey-pending-v1-bad-01","iufes2026-survey-pending-v1-bad-02",
  PRIZE_STORAGE_KEY,PARTICIPANT_STORAGE_KEY,STORAGE_KEY];
type Store=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export function resetLocalProgress(store?:Store):boolean {
  try{
    const target=store ?? window.localStorage;
    for(const key of RESETTABLE_KEYS)target.removeItem(key);
    const epoch=crypto.randomUUID();target.setItem(RESET_STORAGE_KEY,epoch);
    return target.getItem(RESET_STORAGE_KEY)===epoch && RESETTABLE_KEYS.every(key=>target.getItem(key)===null);
  }catch{return false;}
}
