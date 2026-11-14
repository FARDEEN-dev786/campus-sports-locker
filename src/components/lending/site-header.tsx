import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { MAX_ITEMS_PER_STUDENT } from "@/lib/rules";

export function SiteHeader({ held, name }: { held?: number; name?: string | undefined }) {
  const { user, ready } = useAuthUser();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-pitch/40 bg-pitch text-pitch-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="flex items-baseline gap-1 font-display text-2xl font-black uppercase">
          Locker<span className="text-accent">/</span>Room
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            to="/desk"
            className="rounded px-3 py-1.5 opacity-80 hover:opacity-100"
            activeProps={{ className: "bg-chalk/10 opacity-100" }}
          >
            Lending desk
          </Link>
          <Link
            to="/race-lab"
            className="rounded px-3 py-1.5 opacity-80 hover:opacity-100"
            activeProps={{ className: "bg-chalk/10 opacity-100" }}
          >
            Race lab
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {typeof held === "number" && (
            <div className="hidden items-center gap-2 rounded-full border border-chalk/25 px-3 py-1 text-xs sm:flex">
              <span className="locker-tag opacity-70">Holding</span>
              <span className="font-mono font-bold">
                {held}/{MAX_ITEMS_PER_STUDENT}
              </span>
            </div>
          )}
          {ready && user ? (
            <>
              <span className="hidden text-sm opacity-80 md:inline">{name ?? user.email}</span>
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
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
