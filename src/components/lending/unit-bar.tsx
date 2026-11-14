import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/** One cell per physical unit: the semaphore made visible. */
export function UnitBar({
  total,
  free,
  mine,
  lockedOthers,
  borrowedOthers,
}: {
  total: number;
  free: number;
  mine: number;
  lockedOthers: number;
  borrowedOthers: number;
}) {
  const cells: Array<"free" | "mine" | "locked" | "borrowed"> = [
    ...Array(Math.max(0, mine)).fill("mine"),
    ...Array(Math.max(0, free)).fill("free"),
    ...Array(Math.max(0, lockedOthers)).fill("locked"),
    ...Array(Math.max(0, borrowedOthers)).fill("borrowed"),
  ].slice(0, total);
  return (
    <div className="flex flex-wrap gap-1" aria-label={`${free} of ${total} free`}>
      {cells.map((c, i) => (
        <span
          key={i}
          className={cn(
            "unit-cell relative flex items-center justify-center",
            c === "free" && "bg-status-free",
            c === "mine" && "bg-status-mine",
            c === "locked" && "bg-status-locked",
            c === "borrowed" && "bg-status-borrowed/60",
          )}
          title={c}
        >
          {c === "locked" && <Lock className="size-2.5 text-foreground/70" strokeWidth={3} />}
        </span>
      ))}
    </div>
  );
}

export function Legend() {
  const items = [
    ["bg-status-free", "Free"],
    ["bg-status-locked", "Locked by others"],
    ["bg-status-mine", "Yours"],
    ["bg-status-borrowed/60", "Borrowed"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className={cn("unit-cell inline-block w-3.5", c)} />
          {l}
        </span>
      ))}
    </div>
  );
}
