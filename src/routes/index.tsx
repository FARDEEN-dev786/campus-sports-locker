import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Lock, ShieldCheck, Undo2 } from "lucide-react";
import heroImg from "@/assets/hero-equipment.jpg";
import { SiteHeader } from "@/components/lending/site-header";
import { UnitBar, Legend } from "@/components/lending/unit-bar";
import { Button } from "@/components/ui/button";
import { useLendingRealtime } from "@/hooks/use-lending-realtime";
import { equipmentQuery } from "@/lib/lending";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LockerRoom — Borrow College Sports Equipment, Lock-Free of Clashes" },
      {
        name: "description",
        content:
          "Real-time sports equipment lending for college students. Semaphores make sure two students never get the same unit.",
      },
      { property: "og:title", content: "LockerRoom — College Sports Equipment Lending" },
      {
        property: "og:description",
        content: "Pick it, lock it for 10 minutes, confirm it. Live stock guarded by semaphores.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: Lock,
    title: "Level 1 · the entry gate",
    body: "Anyone who sees a free unit (S > 0) can click Select. Several students may get through at the same instant.",
  },
  {
    icon: ShieldCheck,
    title: "Level 2 · the critical section",
    body: "A mutex lets only one request in at a time. The first one in does wait(S) and gets the unit; the rest see “Item unavailable currently — wait”.",
  },
  {
    icon: Clock,
    title: "10-minute hold",
    body: "Your unit stays locked for you. If time runs out, you deselect, or confirmation fails, signal(S) frees it for everyone.",
  },
  {
    icon: Undo2,
    title: "Return = signal",
    body: "Bringing an item back increments its count. Waiting students get pinged the moment S goes above zero.",
  },
];

function Index() {
  const { data: items = [] } = useQuery(equipmentQuery);
  useLendingRealtime();
  const free = items.reduce((a, i) => a + i.available, 0);
  const total = items.reduce((a, i) => a + i.total, 0);
  const locked = items.reduce((a, i) => a + i.locked, 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="court-lines text-pitch-foreground">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <div className="locker-tag opacity-70">College sports store · live</div>
            <h1 className="mt-3 text-6xl font-black uppercase leading-[0.88] md:text-8xl">
              Lock it.
              <br />
              Play it.
              <br />
              <span className="text-accent">Return it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg opacity-85">
              Borrow footballs, rackets, shuttles and more. The moment you select a unit, it's locked
              for you — and every other student sees it locked instantly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/desk">
                  Open the lending desk <ArrowRight />
                </Link>
              </Button>
              <Button variant="ghostChalk" size="lg" asChild>
                <Link to="/race-lab">Try the race lab</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-chalk/20 pt-6">
              {[
                ["Free now", free],
                ["Locked", locked],
                ["In store", total],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="locker-tag opacity-60">{k}</dt>
                  <dd className="font-display text-4xl font-black">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <img
            src={heroImg}
            alt="Football, basketball, rackets, shuttlecocks and bats laid out on a green court"
            width={1280}
            height={960}
            className="w-full rounded-lg border-4 border-chalk/90 object-cover shadow-lift"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="locker-tag text-muted-foreground">How the lock works</div>
        <h2 className="mt-1 text-4xl font-black uppercase md:text-5xl">Two levels of semaphore</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-lg border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <s.icon className="size-6 text-primary" />
                <span className="font-display text-4xl font-black text-muted-foreground/40">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold uppercase">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="locker-tag text-muted-foreground">Stock board · updates live</div>
              <h2 className="mt-1 text-4xl font-black uppercase">What's on the racks</h2>
            </div>
            <Legend />
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 border-b py-2">
                <span className="text-2xl">{it.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{it.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {it.available}/{it.total}
                    </span>
                  </div>
                  <div className="mt-1">
                    <UnitBar
                      total={it.total}
                      free={it.available}
                      mine={0}
                      lockedOthers={it.locked}
                      borrowedOthers={it.borrowed}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-pitch py-8 text-center text-sm text-pitch-foreground/70">
        LockerRoom · an Operating Systems mini project on process synchronization & semaphores
      </footer>
    </div>
  );
}
