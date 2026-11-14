import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SemLog } from "@/lib/lending";

/** Live updates: stock (semaphore values), my reservations and the semaphore monitor. */
export function useLendingRealtime(uid?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`lending-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, () => {
        qc.invalidateQueries({ queryKey: ["equipment"] });
      });
    if (uid) {
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reservations", filter: `owner_id=eq.${uid}` },
          () => qc.invalidateQueries({ queryKey: ["reservations", uid] }),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "semaphore_log" },
          (payload) => {
            const row = payload.new as SemLog;
            qc.setQueryData<SemLog[]>(["semaphore-log"], (old) =>
              [row, ...(old ?? []).filter((r) => r.id !== row.id)].slice(0, 80),
            );
          },
        );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, uid]);
}
