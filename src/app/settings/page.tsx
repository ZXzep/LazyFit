import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import type { Profile, UserActivity } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: activities }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_activities").select("*").order("created_at", { ascending: true }),
  ]);

  return (
    <SettingsClient
      profile={profile as Profile}
      initialActivities={(activities ?? []) as UserActivity[]}
    />
  );
}
