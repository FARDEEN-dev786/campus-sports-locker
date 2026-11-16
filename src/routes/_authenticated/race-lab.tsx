import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/lending/site-header";
import { SiteFooter } from "@/components/lending/site-footer";
import { SemaphoreMonitor } from "@/components/lending/semaphore-monitor";
import { UnitBar } from "@/components/lending/unit-bar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLendingRealtime } from "@/hooks/use-lending-realtime";
import { cn } from "@/lib/utils";
import {
  acquireItem,
  equipmentQuery,
  myReservationsQuery,
  profileQuery,
  releaseSimulation,
  semLogQuery,
  type RpcResult,
} from "@/lib/lending";

export const Route = createFileRoute("/_authenticated/race-lab")({
  head: () => ({
    meta: [
      { title: "Semaphore Demo — Sports Equipment Lending Portal, NSUT" },
      {
        name: "description",
        content: "Send requests from several test students at the same moment and see how the two-level semaphore decides who gets the item.",
      },
      { property: "og:title", content: "Semaphore Demo — NSUT Sports Equipment Portal" },
      { property: "og:description", content: "The critical section problem shown live with semaphores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await releaseSimulation().catch(() => 0);
    await Promise.all([
      context.queryClient.ensureQueryData(equipmentQuery),
      context.queryClient.ensureQueryData(semLogQuery),
      context.queryClient.ensureQueryData(myReservationsQuery(context.user.id)),
    ]);
  },
  component: RaceLab,
});

interface Racer {
  label: string;
  res?: RpcResult;
  ms?: number;
  error?: string;
}

function RaceLab() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(equipmentQuery);
  const { data: logs } = useSuspenseQuery(semLogQuery);
  const { data: mine } = useSuspenseQuery(myReservationsQuery(user.id));
  const { data: profile } = useQuery(profileQuery(user.id));
  useLendingRealtime(user.id);

  const candidates = useMemo(() => items.filter((i) => !i.requires_id), [items]);
  const [itemId, setItemId] = useState(() => candidates.find((c) => c.slug === "carrom-board")?.id ?? candidates[0]?.id);
  const [count, setCount] = useState(5);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [semBefore, setSemBefore] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [releaseIn, setReleaseIn] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const item = items.find((i) => i.id === itemId);

  const release = async () => {
    if (timer.current) clearInterval(timer.current);
    setReleaseIn(null);
    const n = await releaseSimulation().catch(() => 0);
    if (n) toast(`Released ${n} test lock(s): signal(S) called ${n} time(s)`);
    qc.invalidateQueries({ queryKey: ["equipment"] });
  };

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function fire() {
    if (!item) return;
    setRunning(true);
    setSemBefore(item.available);
    const labels = Array.from({ length: count }, (_, i) => `Test-Student-${i + 1}`);
    setRacers(labels.map((label) => ({ label })));
    // All requests leave the browser at the same instant — a real race.
    const results = await Promise.all(
      labels.map(async (label): Promise<Racer> => {
        const t0 = performance.now();
        try {
          const res = await acquireItem(item.id, label);
          return { label, res, ms: Math.round(performance.now() - t0) };
        } catch (e) {
          return { label, error: (e as Error).message, ms: Math.round(performance.now() - t0) };
        }
      }),
    );
    setRacers(results);
    setRunning(false);
    qc.invalidateQueries({ queryKey: ["equipment"] });
    setReleaseIn(15);
    timer.current = setInterval(() => {
      setReleaseIn((s) => {
        if (s === null) return s;
        if (s <= 1) {
          release();
          return null;
        }
        return s - 1;
      });
    }, 1000);
  }

  const winners = racers.filter((r) => r.res?.status === "acquired").length;
  const losers = racers.filter((r) => r.res && r.res.status !== "acquired").length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader held={mine.length} name={profile?.full_name} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Semaphore demo</h1>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
              This page sends requests from several test students at exactly the same moment, to
              show the critical section problem. Everyone who sees a free unit passes{" "}
              <b className="text-foreground">Level 1</b>. At <b className="text-foreground">Level 2</b>{" "}
              only one request at a time can enter the critical section. Whoever gets the mutex first
              takes the unit, and the rest are told the item is unavailable and must wait.
            </p>
          </div>
          <div className="rounded border bg-card p-5">
            <div className="section-label mb-3">Step 1: choose the item everyone will try to take</div>
            <div className="flex flex-wrap gap-2">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setItemId(c.id)}
                  className={cn(
                    "flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors",
                    c.id === itemId ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <span>{c.icon}</span> {c.name}
                  <span className="font-mono text-xs opacity-70">S={c.available}</span>
                </button>
              ))}
            </div>

            <div className="section-label mb-3 mt-6">
              Step 2: number of test students: {count}
            </div>
            <Slider value={[count]} min={2} max={8} step={1} onValueChange={(v) => setCount(v[0] ?? 5)} className="max-w-sm" />

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button variant="hero" onClick={fire} disabled={running || !item || releaseIn !== null}>
                {running ? <Loader2 className="animate-spin" /> : <Zap />} Send {count} requests at once
              </Button>
              {releaseIn !== null && (
                <Button variant="outline" onClick={release}>
                  Release test locks ({releaseIn}s)
                </Button>
              )}
              {item && (
                <div className="flex min-w-[200px] flex-1 items-center gap-3">
                  <span className="font-mono text-sm">S = {item.available}</span>
                  <div className="flex-1">
                    <UnitBar
                      total={item.total}
                      free={item.available}
                      mine={0}
                      lockedOthers={item.locked}
                      borrowedOthers={item.borrowed}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {racers.length > 0 && (
            <div className="rounded border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">Result</h2>
                {!running && semBefore !== null && (
                  <p className="font-mono text-sm text-muted-foreground">
                    S before = {semBefore} → {winners} got a lock, {losers} must wait
                  </p>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {racers.map((r) => {
                  const won = r.res?.status === "acquired";
                  const l1 = r.res ? (r.res.level === 1 ? "blocked" : "passed") : null;
                  return (
                    <div
                      key={r.label}
                      className={cn(
                        "rounded border p-3",
                        won && "border-status-free bg-status-free/10",
                        r.res && !won && "border-status-locked bg-status-locked/10",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {!r.res && !r.error ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : won ? (
                          <CheckCircle2 className="size-4 text-status-free" />
                        ) : (
                          <XCircle className="size-4 text-destructive" />
                        )}
                        <span className="font-semibold">{r.label}</span>
                        {r.ms !== undefined && (
                          <span className="ml-auto font-mono text-xs text-muted-foreground">{r.ms} ms</span>
                        )}
                      </div>
                      {r.res && (
                        <div className="mt-2 space-y-0.5 font-mono text-xs">
                          <div>
                            L1: {l1 === "passed" ? "✓ passed" : "✗ blocked"} (saw S={r.res.seen})
                          </div>
                          {l1 === "passed" && (
                            <div>L2: {won ? `✓ entered critical section, S → ${r.res.sem_after}` : "✗ lost the race"}</div>
                          )}
                          <div className="pt-1 font-sans text-sm text-foreground">
                            {won ? "Locked for 10 minutes" : "Item unavailable currently — has to wait"}
                          </div>
                        </div>
                      )}
                      {r.error && <div className="mt-2 text-xs text-destructive">{r.error}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SemaphoreMonitor logs={logs} />
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
