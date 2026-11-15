import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { MAX_ITEMS_PER_STUDENT } from "@/lib/rules";

const navLink = "rounded px-3 py-1.5 opacity-85 hover:bg-chalk/10 hover:opacity-100";

export function SiteHeader({ held, name }: { held?: number; name?: string | undefined }) {
  const { user, ready } = useAuthUser();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-pitch text-pitch-foreground">
      <div className="border-b border-chalk/15 bg-chalk/5">
        <div className="mx-auto max-w-6xl px-4 py-1 text-xs opacity-80">
          Netaji Subhas University of Technology, New Delhi · Sports Room
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link to="/" className="font-display text-lg font-bold leading-tight">
          Sports Equipment Lending Portal
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/" className={navLink} activeOptions={{ exact: true }} activeProps={{ className: "bg-chalk/15 opacity-100" }}>
            Home
          </Link>
          <Link to="/desk" className={navLink} activeProps={{ className: "bg-chalk/15 opacity-100" }}>
            Borrow equipment
          </Link>
          <Link to="/race-lab" className={navLink} activeProps={{ className: "bg-chalk/15 opacity-100" }}>
            Semaphore demo
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {typeof held === "number" && (
            <span className="hidden text-sm opacity-85 sm:inline">
              Items: <b>{held}/{MAX_ITEMS_PER_STUDENT}</b>
            </span>
          )}
          {ready && user ? (
            <>
              <span className="hidden text-sm opacity-85 md:inline">{name ?? user.email}</span>
              <Button
                variant="ghostChalk"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut /> Sign out
              </Button>
            </>
          ) : ready ? (
            <Button variant="chalk" size="sm" asChild>
              <Link to="/auth">Student login</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
