import { describe, expect, it } from "vitest";
import {
  LOCK_MINUTES,
  MAX_ITEMS_PER_STUDENT,
  formatCountdown,
  remainingMs,
  selectionBlock,
  type ItemLite,
} from "./rules";

const racket: ItemLite = { id: "r", name: "Badminton Racket", available: 4, requires_id: null };
const shuttle: ItemLite = { id: "s", name: "Shuttlecock", available: 10, requires_id: "r" };
const football: ItemLite = { id: "f", name: "Football", available: 2, requires_id: null };
const all = [racket, shuttle, football];

describe("lending rules", () => {
  it("allows at most 3 items per student", () => {
    expect(MAX_ITEMS_PER_STUDENT).toBe(3);
    const three = [
      { equipment_id: "f", status: "locked" },
      { equipment_id: "r", status: "borrowed" },
      { equipment_id: "s", status: "locked" },
    ];
    expect(selectionBlock(football, three, all)?.kind).toBe("limit");
    expect(selectionBlock(football, three.slice(0, 2), all)).toBeNull();
  });

  it("only lets a student pick a shuttlecock after holding a racket", () => {
    expect(selectionBlock(shuttle, [], all)?.kind).toBe("dependency");
    expect(selectionBlock(shuttle, [{ equipment_id: "r", status: "locked" }], all)).toBeNull();
  });

  it("released or returned items no longer count", () => {
    const old = [
      { equipment_id: "r", status: "returned" },
      { equipment_id: "f", status: "expired" },
      { equipment_id: "f", status: "released" },
    ];
    expect(selectionBlock(shuttle, old, all)?.kind).toBe("dependency");
  });

  it("blocks selection when no units are free", () => {
    expect(selectionBlock({ ...football, available: 0 }, [], all)?.kind).toBe("unavailable");
  });

  it("locks last 10 minutes", () => {
    expect(LOCK_MINUTES).toBe(10);
    const now = Date.parse("2026-01-01T10:00:00Z");
    expect(formatCountdown(remainingMs("2026-01-01T10:10:00Z", now))).toBe("10:00");
    expect(remainingMs("2026-01-01T09:59:00Z", now)).toBe(0);
  });
});
