import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero-equipment.jpg";
import { SiteHeader } from "@/components/lending/site-header";
import { SiteFooter } from "@/components/lending/site-footer";
import { Button } from "@/components/ui/button";
import { useLendingRealtime } from "@/hooks/use-lending-realtime";
import { equipmentQuery } from "@/lib/lending";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sports Equipment Lending Portal — NSUT" },
      {
        name: "description",
        content:
          "Borrow sports equipment from the NSUT sports room online. Semaphores make sure two students never get the same item.",
      },
      { property: "og:title", content: "Sports Equipment Lending Portal — NSUT" },
      {
        property: "og:description",
        content: "OS mini project: an equipment lending portal that uses semaphores for process synchronization.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  "Log in with your college email and pick an item from the list.",
  "When you click Select, one unit of that item is locked for you for 10 minutes. Other students see it as locked straight away.",
  "Confirm the borrowing by typing your roll number within the 10 minutes. The item is then issued to you.",
  "If the time runs out, you deselect the item, or you type a wrong roll number, the lock is removed and the item goes back to the list.",
  "When you return an item, its available count goes up by one and anyone waiting for it is told.",
];

const rules = [
  "A student can hold at most 3 items at a time.",
  "A lock lasts 10 minutes.",
  "Shuttlecocks can only be taken with a badminton racket. The same goes for tennis balls, cricket balls, table tennis balls and hockey balls with their matching item.",
  "If two students click the last unit at the same moment, only one gets it. The other sees “Item unavailable currently — please wait”.",
];

function Index() {
  const { data: items = [] } = useQuery(equipmentQuery);
  useLendingRealtime();
  const free = items.reduce((a, i) => a + i.available, 0);
  const total = items.reduce((a, i) => a + i.total, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <section className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-sm text-muted-foreground">Operating Systems Mini Project · NSUT</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">Sports Equipment Lending Portal</h1>
            <p className="mt-4 text-[17px] leading-relaxed">
              This portal lets students of NSUT borrow sports equipment like footballs, rackets,
              shuttlecocks and bats from the college sports room without standing in a queue.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The main idea of the project is <b className="text-foreground">process synchronization</b>.
              Many students can use the site at the same time, so every item is protected by a{" "}
              <b className="text-foreground">counting semaphore</b> (its number of free units) and a{" "}
              <b className="text-foreground">mutex</b>. It works like seat booking on BookMyShow: once
              you select something it is locked for you, and nobody else can take that unit.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="hero" asChild>
                <Link to="/desk">Borrow equipment</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/race-lab">See the semaphore demo</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Right now <b className="text-foreground">{free}</b> of <b className="text-foreground">{total}</b>{" "}
              units are free in the sports room.
            </p>
          </div>
          <img
            src={heroImg}
            alt="Football, basketball, rackets, shuttlecocks and bats kept in the sports room"
            width={1280}
            height={960}
            className="w-full rounded border object-cover"
          />
        </section>

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-xl font-bold">Rules</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              {rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold">Current stock</h2>
          <p className="mt-1 text-sm text-muted-foreground">This table updates by itself when anyone locks or returns an item.</p>
          <div className="mt-3 overflow-x-auto rounded border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">S.No.</th>
                  <th className="px-3 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 font-semibold">Sport</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Available</th>
                  <th className="px-3 py-2 text-right font-semibold">Locked</th>
                  <th className="px-3 py-2 text-right font-semibold">Issued</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="mr-1.5">{it.icon}</span>
                      {it.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{it.category}</td>
                    <td className="px-3 py-2 text-right">{it.total}</td>
                    <td className="px-3 py-2 text-right font-semibold text-status-free">{it.available}</td>
                    <td className="px-3 py-2 text-right">{it.locked}</td>
                    <td className="px-3 py-2 text-right">{it.borrowed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
