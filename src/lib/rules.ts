// Client-side mirror of the lending rules. The database functions are the
// source of truth (they run inside the critical section); these helpers only
// decide what the buttons show before a request is sent.

export const MAX_ITEMS_PER_STUDENT = 3;
export const LOCK_MINUTES = 10;
export const LOCK_MS = LOCK_MINUTES * 60 * 1000;

export type HoldingStatus = "locked" | "borrowed";
export interface Holding {
  equipment_id: string;
  status: HoldingStatus | string;
}
export interface ItemLite {
  id: string;
  name: string;
  available: number;
  requires_id: string | null;
}

export type BlockReason =
  | { kind: "unavailable"; message: string }
  | { kind: "limit"; message: string }
  | { kind: "dependency"; message: string; requiresName: string };

export function activeHoldings(holdings: Holding[]) {
  return holdings.filter((h) => h.status === "locked" || h.status === "borrowed");
}

export function selectionBlock(
  item: ItemLite,
  holdings: Holding[],
  allItems: ItemLite[],
): BlockReason | null {
  const active = activeHoldings(holdings);
  if (active.length >= MAX_ITEMS_PER_STUDENT) {
    return {
      kind: "limit",
      message: `You already hold ${MAX_ITEMS_PER_STUDENT} items — the maximum allowed.`,
    };
  }
  if (item.requires_id && !active.some((h) => h.equipment_id === item.requires_id)) {
    const parent = allItems.find((i) => i.id === item.requires_id);
    const requiresName = parent?.name ?? "the matching item";
    return {
      kind: "dependency",
      requiresName,
      message: `Select a ${requiresName} first.`,
    };
  }
  if (item.available <= 0) {
    return { kind: "unavailable", message: "Item unavailable currently — you have to wait." };
  }
  return null;
}

export function remainingMs(expiresAt: string, now: number) {
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

export function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
