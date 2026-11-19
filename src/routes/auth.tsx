import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { SiteHeader } from "@/components/lending/site-header";
import { SiteFooter } from "@/components/lending/site-footer";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Student Login — Sports Equipment Lending Portal, NSUT" },
      { name: "description", content: "NSUT students log in here to borrow sports equipment from the sports room." },
      { property: "og:title", content: "Student Login — Sports Equipment Lending Portal" },
      { property: "og:description", content: "Student login for the NSUT sports equipment lending portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

// Shared demo account so teachers / testers can try the portal without signing up.
const DEMO = { email: "demo.student@nsut.ac.in", password: "DemoStudent@2026", roll: "2025UCS0001" };

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

  async function demoLogin() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO.email, password: DEMO.password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded border bg-card p-6 shadow-card">
          {sent ? (
            <div className="space-y-3 text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground">
                We sent a confirmation link to <b>{form.email}</b>. Open it, then come back here to log in.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Back to login
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Student login</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your college email. You need your roll number to confirm a borrowing.
              </p>
              <Tabs defaultValue="signin" className="mt-5">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Log in</TabsTrigger>
                  <TabsTrigger value="signup">New student</TabsTrigger>
                </TabsList>

                <Button variant="google" className="mt-5 w-full" onClick={google} type="button">
                  <GoogleG /> Continue with Google
                </Button>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
                </div>

                <Button type="button" variant="outline" className="mb-2 w-full" onClick={demoLogin} disabled={busy}>
                  Log in as demo student
                </Button>
                <p className="mb-4 text-center text-xs text-muted-foreground">
                  Demo roll number (needed to confirm borrowing): <b>{DEMO.roll}</b>
                </p>

                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-4">
                    <Field id="si-email" label="College email" type="email" value={form.email} onChange={set("email")} />
                    <Field id="si-pass" label="Password" type="password" value={form.password} onChange={set("password")} />
                    <Button type="submit" variant="lock" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="animate-spin" />} Log in
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
                      label="Password (at least 6 characters)"
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
            </>
          )}
        </div>
      </main>
      <SiteFooter />
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
