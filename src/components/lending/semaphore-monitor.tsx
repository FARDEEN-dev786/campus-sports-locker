import { cn } from "@/lib/utils";
import type { SemLog } from "@/lib/lending";

const opTone: Record<string, string> = {
  ENTER: "text-terminal-foreground",
  WAIT: "text-status-mine",
  LOCK: "text-status-free",
  SIGNAL: "text-accent",
  BLOCK: "text-destructive",
  DENY: "text-destructive",
  FAIL: "text-destructive",
  CONFIRM: "text-status-free",
};

function time(ts: string) {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

export function SemaphoreMonitor({ logs, className }: { logs: SemLog[]; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-lg bg-terminal text-terminal-foreground", className)}>
      <header className="flex items-center justify-between border-b border-terminal-line px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest">semaphore monitor</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-terminal-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-status-free" /> live
        </span>
      </header>
      <ol className="max-h-[420px] space-y-0 overflow-y-auto px-2 py-2 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 && (
          <li className="px-2 py-4 text-terminal-muted">
            waiting for processes<span className="animate-blink">_</span>
          </li>
        )}
        {logs.map((l) => (
          <li key={l.id} className="animate-slide-in rounded px-2 py-1 hover:bg-terminal-line/50">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-terminal-muted">{time(l.created_at)}</span>
              {l.level && (
                <span className="rounded border border-terminal-line px-1 text-[10px] text-terminal-muted">
                  L{l.level}
                </span>
              )}
              <span className={cn("font-bold", opTone[l.op] ?? "")}>{l.op}</span>
              <span className="text-pitch-foreground">{l.actor}</span>
              {l.equipment_name && <span className="text-terminal-muted">· {l.equipment_name}</span>}
              {l.sem_value !== null && (
                <span className="ml-auto text-terminal-muted">S={l.sem_value}</span>
              )}
            </div>
            <div className="text-terminal-foreground/80">{l.message}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
