import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, LOCK_MS, MAX_ITEMS_PER_STUDENT, remainingMs } from "@/lib/rules";
import type { Equipment, Reservation } from "@/lib/lending";

export function HoldingsPanel({
  items,
  mine,
  busyId,
  onRelease,
  onReturn,
  onConfirm,
  onExpired,
}: {
  items: Equipment[];
  mine: Reservation[];
  busyId: string | null;
  onRelease: (r: Reservation) => void;
  onReturn: (r: Reservation) => void;
  onConfirm: (roll: string) => Promise<void>;
  onExpired: () => void;
}) {
  const now = useNow(500);
  const locked = mine.filter((r) => r.status === "locked");
  const borrowed = mine.filter((r) => r.status === "borrowed");
  const byId = (id: string) => items.find((i) => i.id === id);
  const [open, setOpen] = useState(false);
  const [roll, setRoll] = useState("");
  const [confirming, setConfirming] = useState(false);

  // When a countdown reaches zero, ask the server to run signal(S) for expired locks.
  const fired = useRef(new Set<string>());
  useEffect(() => {
    for (const r of locked) {
      if (remainingMs(r.expires_at, now) === 0 && !fired.current.has(r.id)) {
        fired.current.add(r.id);
        onExpired();
      }
    }
  }, [now, locked, onExpired]);

  return (
    <section className="rounded border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-bold">My items</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {mine.length} of {MAX_ITEMS_PER_STUDENT}
        </span>
      </header>

      <div className="space-y-3 p-4">
        <div className="locker-tag">Locked for you (confirm within 10 minutes)</div>
        {locked.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nothing selected yet. Choose an item from the list.
          </p>
        )}
        {locked.map((r) => {
          const it = byId(r.equipment_id);
          const ms = remainingMs(r.expires_at, now);
          const urgent = ms < 60_000;
          return (
            <div key={r.id} className="rounded border border-status-mine/40 bg-status-mine/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{it?.icon}</span>
                <span className="flex-1 truncate font-semibold">{it?.name}</span>
                <span
                  className={`flex items-center gap-1 font-mono text-sm font-bold ${urgent ? "text-destructive" : "text-status-mine"}`}
                >
                  <Timer className="size-3.5" />
                  {formatCountdown(ms)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`Deselect ${it?.name}`}
                  disabled={busyId === r.id}
                  onClick={() => onRelease(r)}
                >
                  {busyId === r.id ? <Loader2 className="animate-spin" /> : <X />}
                </Button>
              </div>
              <Progress value={(ms / LOCK_MS) * 100} className="mt-2 h-1" />
            </div>
          );
        })}
        {locked.length > 0 && (
          <Button variant="hero" className="w-full" onClick={() => setOpen(true)}>
            <CheckCircle2 /> Confirm borrowing ({locked.length})
          </Button>
        )}

        <div className="locker-tag pt-2">Issued to you</div>
        {borrowed.length === 0 && <p className="text-sm text-muted-foreground">No items issued.</p>}
        {borrowed.map((r) => {
          const it = byId(r.equipment_id);
          return (
            <div key={r.id} className="flex items-center gap-2 rounded border bg-muted/50 p-3">
              <span className="text-xl">{it?.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{it?.name}</div>
                <div className="text-xs text-muted-foreground">
                  since{" "}
                  {r.confirmed_at
                    ? new Date(r.confirmed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => onReturn(r)}>
                {busyId === r.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} Return
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm your borrowing</DialogTitle>
            <DialogDescription>
              Type your roll number to confirm. If it does not match the roll number on your
              account, the confirmation fails and all {locked.length} locked item(s) are released.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">
            {locked.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span>{byId(r.equipment_id)?.icon}</span> {byId(r.equipment_id)?.name}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {formatCountdown(remainingMs(r.expires_at, now))}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="roll">Roll number</Label>
            <Input
              id="roll"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder="e.g. 22BCS1042"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button
              variant="lock"
              disabled={!roll.trim() || confirming}
              onClick={async () => {
                setConfirming(true);
                try {
                  await onConfirm(roll);
                  setOpen(false);
                  setRoll("");
                } finally {
                  setConfirming(false);
                }
              }}
            >
              {confirming && <Loader2 className="animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
