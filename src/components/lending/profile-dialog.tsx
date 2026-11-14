import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/lending";

/** Students who signed up with Google have no roll number yet — collect it once. */
export function ProfileDialog({ uid, profile }: { uid: string; profile: Profile | null }) {
  const qc = useQueryClient();
  const needs = !profile || !profile.roll_number;
  const [name, setName] = useState(profile?.full_name ?? "");
  const [roll, setRoll] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setName(profile?.full_name ?? ""), [profile?.full_name]);

  return (
    <Dialog open={needs}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl uppercase">Your student card</DialogTitle>
          <DialogDescription>
            We need your roll number once — you'll type it again to confirm each borrowing.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            const { error } = await supabase
              .from("profiles")
              .upsert({ id: uid, full_name: name.trim(), roll_number: roll.trim() });
            setSaving(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            qc.invalidateQueries({ queryKey: ["profile", uid] });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="pname">Full name</Label>
            <Input id="pname" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proll">Roll number</Label>
            <Input id="proll" required value={roll} onChange={(e) => setRoll(e.target.value)} />
          </div>
          <Button type="submit" variant="lock" className="w-full" disabled={saving}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
