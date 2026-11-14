import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — LockerRoom" },
      { name: "description", content: "Sign in with your student account to borrow sports equipment." },
      { property: "og:title", content: "Sign in — LockerRoom" },
      { property: "og:description", content: "Student sign-in for the college sports equipment store." },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  if (!p) return "/desk";
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/desk";
  } catch {
    return "/desk";
  }
}

function GoogleG() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", roll: "", email: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safePath(search.redirect) });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: safePath(search.redirect) });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, search.redirect]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.name, roll_number: form.roll },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) setSent(true);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="court-lines hidden flex-col justify-between p-10 text-pitch-foreground lg:flex">
        <Link to="/" className="font-display text-3xl font-black uppercase">
          Locker<span className="text-accent">/</span>Room
        </Link>
        <div>
          <h1 className="text-6xl font-black uppercase leading-[0.9]">
            Your student card
            <br />
            is your <span className="text-accent">key.</span>
          </h1>
          <p className="mt-4 max-w-md opacity-80">
            Every unit in the store is guarded by a semaphore. Sign in to lock up to three items for
            10 minutes and confirm them with your roll number.
          </p>
        </div>
        <div className="locker-tag opacity-60">OS mini project · process synchronization</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-black uppercase">Check your inbox</h2>
              <p className="text-muted-foreground">
                We sent a confirmation link to <b>{form.email}</b>. Open it, then come back to sign in.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <Button variant="google" className="mt-6 w-full" onClick={google} type="button">
                <GoogleG /> Continue with Google
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
              </div>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4">
                  <Field id="si-email" label="College email" type="email" value={form.email} onChange={set("email")} />
                  <Field id="si-pass" label="Password" type="password" value={form.password} onChange={set("password")} />
                  <Button type="submit" variant="lock" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4">
                  <Field id="su-name" label="Full name" value={form.name} onChange={set("name")} />
                  <Field id="su-roll" label="Roll number" value={form.roll} onChange={set("roll")} />
                  <Field id="su-email" label="College email" type="email" value={form.email} onChange={set("email")} />
                  <Field
                    id="su-pass"
                    label="Password (min 6)"
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    minLength={6}
                  />
                  <Button type="submit" variant="lock" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} required {...props} />
    </div>
  );
}
