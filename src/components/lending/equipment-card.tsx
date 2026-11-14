import { useEffect, useRef, useState } from "react";
import { Bell, Link2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lockerCode, type Equipment, type Reservation } from "@/lib/lending";
import { selectionBlock } from "@/lib/rules";
import { UnitBar } from "./unit-bar";

export function EquipmentCard({
  item,
  all,
  mine,
  pending,
  waiting,
  onSelect,
  onWait,
}: {
  item: Equipment;
  all: Equipment[];
  mine: Reservation[];
  pending: boolean;
  waiting: boolean;
  onSelect: () => void;
  onWait: () => void;
}) {
  const myHere = mine.filter((r) => r.equipment_id === item.id);
  const myLocked = myHere.filter((r) => r.status === "locked").length;
  const myBorrowed = myHere.filter((r) => r.status === "borrowed").length;
  const lockedOthers = Math.max(0, item.locked - myLocked);
  const borrowedOthers = Math.max(0, item.borrowed - myBorrowed);
  const block = selectionBlock(item, mine, all);
  const parent = item.requires_id ? all.find((i) => i.id === item.requires_id) : null;

  // Flash the card when another student's lock changes the count in real time.
  const prev = useRef({ locked: item.locked, mine: myLocked });
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    const p = prev.current;
    if (item.locked !== p.locked && myLocked === p.mine) setFlash((f) => f + 1);
    prev.current = { locked: item.locked, mine: myLocked };
  }, [item.locked, myLocked]);

  return (
    <article
      key={flash}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-lift",
        flash > 0 && "animate-lock-flash",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-2xl">
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="locker-tag text-muted-foreground">{lockerCode(item)}</div>
          <h3 className="truncate text-xl font-bold uppercase leading-tight">{item.name}</h3>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-black leading-none">{item.available}</div>
          <div className="locker-tag text-muted-foreground">of {item.total}</div>
        </div>
      </div>

      <UnitBar
        total={item.total}
        free={item.available}
        mine={myLocked + myBorrowed}
        lockedOthers={lockedOthers}
        borrowedOthers={borrowedOthers}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{item.available} free</span>
        <span className="flex items-center gap-1">
          <Lock className="size-3" /> {item.locked} locked
        </span>
        <span>{item.borrowed} out</span>
        {parent && (
          <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-foreground">
            <Link2 className="size-3" /> needs {parent.name}
          </span>
        )}
      </div>

      <div className="mt-auto">
        {pending ? (
          <Button variant="lock" className="w-full" disabled>
            <Loader2 className="animate-spin" /> Requesting lock…
          </Button>
        ) : block?.kind === "limit" ? (
          <Button variant="outline" className="w-full" disabled>
            Limit reached (3/3)
          </Button>
        ) : block?.kind === "dependency" ? (
          <Button variant="outline" className="w-full" disabled>
            Select a {block.requiresName} first
          </Button>
        ) : block?.kind === "unavailable" && myHere.length > 0 ? (
          <Button variant="outline" className="w-full" disabled>
            You hold the last unit
          </Button>
        ) : block?.kind === "unavailable" ? (
          <Button variant="wait" className="w-full" onClick={onWait}>
            <Bell /> {waiting ? "Waiting — we'll ping you" : "Unavailable · wait for it"}
          </Button>
        ) : (
          <Button variant="lock" className="w-full" onClick={onSelect}>
            Select &amp; lock 1
          </Button>
        )}
      </div>
    </article>
  );
}
