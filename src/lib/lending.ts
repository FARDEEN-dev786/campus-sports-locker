import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type SemLog = Database["public"]["Tables"]["semaphore_log"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface RpcResult {
  status:
    | "acquired"
    | "unavailable"
    | "race_lost"
    | "limit"
    | "dependency"
    | "released"
    | "returned"
    | "confirmed"
    | "failed"
    | "empty"
    | "noop";
  message?: string;
  level?: number;
  seen?: number;
  sem_after?: number;
  reservation_id?: string;
  expires_at?: string;
  count?: number;
  released?: number;
}

export const equipmentQuery = queryOptions({
  queryKey: ["equipment"],
  queryFn: async () => {
    const { data, error } = await supabase.from("equipment").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const myReservationsQuery = (uid: string) =>
  queryOptions({
    queryKey: ["reservations", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("owner_id", uid)
        .eq("is_simulation", false)
        .in("status", ["locked", "borrowed"])
        .order("locked_at");
      if (error) throw error;
      return data;
    },
  });

export const semLogQuery = queryOptions({
  queryKey: ["semaphore-log"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("semaphore_log")
      .select("*")
      .order("id", { ascending: false })
      .limit(80);
    if (error) throw error;
    return data;
  },
});

export const profileQuery = (uid: string) =>
  queryOptions({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

async function rpc<T = RpcResult>(fn: string, args?: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

export const acquireItem = (equipmentId: string, simLabel?: string) =>
  rpc("acquire_item", { p_equipment_id: equipmentId, p_sim_label: simLabel ?? null });
export const releaseItem = (reservationId: string) =>
  rpc("release_item", { p_reservation_id: reservationId });
export const confirmBorrow = (roll: string) => rpc("confirm_borrow", { p_roll_number: roll });
export const returnItem = (reservationId: string) =>
  rpc("return_item", { p_reservation_id: reservationId });
export const releaseExpired = () => rpc<number>("release_expired");
export const releaseSimulation = () => rpc<number>("release_simulation");

export function groupByCategory(items: Equipment[]) {
  const map = new Map<string, Equipment[]>();
  for (const it of items) {
    const list = map.get(it.category) ?? [];
    list.push(it);
    map.set(it.category, list);
  }
  return [...map.entries()];
}

export function lockerCode(item: Equipment) {
  return `Item No. ${String(item.sort_order).padStart(2, "0")}`;
}
