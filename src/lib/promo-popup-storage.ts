const KEY = "dkb_promo_verano";

export function shouldShowPopup(
  now: number,
  frequencyDays: number,
  storage: Pick<Storage, "getItem">,
): boolean {
  const raw = storage.getItem(KEY);
  if (!raw) return true;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return true;
  return now - ts > frequencyDays * 864e5;
}

export function markPopupSeen(now: number, storage: Pick<Storage, "setItem">): void {
  storage.setItem(KEY, String(now));
}
