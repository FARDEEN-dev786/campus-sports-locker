import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Hourglass, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/lending/site-header";
import { SiteFooter } from "@/components/lending/site-footer";
import { EquipmentCard } from "@/components/lending/equipment-card";
import { HoldingsPanel } from "@/components/lending/holdings-panel";
import { SemaphoreMonitor } from "@/components/lending/semaphore-monitor";
import { ProfileDialog } from "@/components/lending/profile-dialog";
import { Legend } from "@/components/lending/unit-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLendingRealtime } from "@/hooks/use-lending-realtime";
import {
  acquireItem,
  confirmBorrow,
  equipmentQuery,
  groupByCategory,
  myReservationsQuery,
  profileQuery,
  releaseExpired,
  releaseItem,
  returnItem,
  semLogQuery,
  type Equipment,
  type Reservation,
  type RpcResult,
} from "@/lib/lending";

export const Route = createFileRoute("/_authenticated/desk")({
  head: () => ({
    meta: [
      { title: "Borrow Equipment — Sports Equipment Lending Portal, NSUT" },
      {
        name: "description",
        content: "Select, lock and confirm sports equipment from the NSUT sports room. Every unit is guarded by a semaphore.",
      },
      { property: "og:title", content: "Borrow Equipment — NSUT Sports Room" },
      { property: "og:description", content: "Live sports equipment lending with semaphore locks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await releaseExpired().catch(() => 0);
    const uid = context.user.id;
    await Promise.all([
      context.queryClient.ensureQueryData(equipmentQuery),
      context.queryClient.ensureQueryData(myReservationsQuery(uid)),
      context.queryClient.ensureQueryData(semLogQuery),
    ]);
  },
  component: Desk,
});

function Desk() {
  const { user } = Route.useRouteContext();
  const uid = user.id;
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(equipmentQuery);
  const { data: mine } = useSuspenseQuery(myReservationsQuery(uid));
  const { data: logs } = useSuspenseQuery(semLogQuery);
  const { data: profile, isFetched: profileFetched } = useQuery(profileQuery(uid));
  useLendingRealtime(uid);

  const [pending, setPending] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<{ item: Equipment; res: RpcResult } | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["equipment"] });
    qc.invalidateQueries({ queryKey: ["reservations", uid] });
  }, [qc, uid]);

  // Wake waiting students when a unit is signalled back (S goes from 0 to >0).
  useEffect(() => {
    if (waitlist.size === 0) return;
    const freed = items.filter((i) => waitlist.has(i.id) && i.available > 0);
    if (freed.length === 0) return;
    for (const f of freed) toast.success(`${f.icon} ${f.name} is available again.`);
    setWaitlist((w) => {
      const n = new Set(w);
      freed.forEach((f) => n.delete(f.id));
      return n;
    });
  }, [items, waitlist]);

  // Backstop for other students' expired locks: run the timeout sweep while anything is locked.
  const anyLocked = items.some((i) => i.locked > 0);
  useEffect(() => {
    if (!anyLocked) return;
    const t = setInterval(() => releaseExpired().catch(() => 0), 30_000);
    return () => clearInterval(t);
  }, [anyLocked]);

  async function select(item: Equipment) {
    setPending((p) => new Set(p).add(item.id));
    try {
      const res = await acquireItem(item.id);
      if (res.status === "acquired") {
        toast.success(res.message ?? "Locked for 10 minutes");
      } else if (res.status === "race_lost" || res.status === "unavailable") {
        setBlocked({ item, res });
        setWaitlist((w) => new Set(w).add(item.id));
      } else {
        toast.error(res.message ?? "Request denied");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(item.id);
        return n;
      });
      refresh();
    }
  }

  async function act(r: Reservation, fn: (id: string) => Promise<RpcResult>, ok: string) {
    setBusyId(r.id);
    try {
      await fn(r.id);
      toast(ok);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  const groups = useMemo(() => groupByCategory(items), [items]);
  const onExpired = useCallback(() => {
    releaseExpired()
      .then((n) => n > 0 && toast.warning("Your 10 minutes ran out, so the item was released for others."))
      .finally(refresh);
  }, [refresh]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader held={mine.length} name={profile?.full_name} />
      {profileFetched && <ProfileDialog uid={uid} profile={profile ?? null} />}

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Borrow equipment</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Click Select to lock one unit for 10 minutes. Other students will see it as locked
                straight away. You can hold up to 3 items.
              </p>
            </div>
            <Legend />
          </div>

          {groups.map(([category, list]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">{category}</h2>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{list.length} item(s)</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((it) => (
                  <EquipmentCard
                    key={it.id}
                    item={it}
                    all={items}
                    mine={mine}
                    pending={pending.has(it.id)}
                    waiting={waitlist.has(it.id)}
                    onSelect={() => select(it)}
                    onWait={() => {
                      setWaitlist((w) => new Set(w).add(it.id));
                      toast(`You are now waiting for ${it.name}. We will tell you when one is free.`);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <HoldingsPanel
            items={items}
            mine={mine}
            busyId={busyId}
            onRelease={(r) => act(r, releaseItem, "Deselected. The item is free for others again.")}
            onReturn={(r) => act(r, returnItem, "Returned. Available count increased by 1.")}
            onExpired={onExpired}
            onConfirm={async (roll) => {
              try {
                const res = await confirmBorrow(roll);
                if (res.status === "confirmed") toast.success(res.message);
                else if (res.status === "failed") toast.error(res.message);
                else toast(res.message ?? "Nothing to confirm");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                refresh();
              }
            }}
          />
          <SemaphoreMonitor logs={logs} />
        </aside>
      </main>
      <SiteFooter />

      <Dialog open={!!blocked} onOpenChange={(o) => !o && setBlocked(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-status-locked/25">
              {blocked?.res.status === "race_lost" ? <ShieldAlert /> : <Hourglass />}
            </div>
            <DialogTitle className="text-xl">Item unavailable currently</DialogTitle>
            <DialogDescription>
              {blocked?.res.message} You have to wait. We will tell you as soon as a{" "}
              {blocked?.item.name} is released.
            </DialogDescription>
          </DialogHeader>
          {blocked?.res.status === "race_lost" && (
            <div className="rounded-md bg-terminal p-3 font-mono text-xs text-terminal-foreground">
              Level 1 ✓ you saw S = {blocked.res.seen} and entered
              <br />
              Level 2 ✗ another student entered the critical section first and took the last unit
            </div>
          )}
          <DialogFooter>
            <Button variant="lock" onClick={() => setBlocked(null)}>
              OK, I'll wait
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
