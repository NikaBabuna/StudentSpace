import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EmployerLayout from "../EmployerLayout";

export default async function EmployerSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, is_employer").eq("id", user.id).single();
  if (!profile?.is_employer) redirect("/dashboard");

  const fullName = profile.full_name ?? "";
  const userInitials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <EmployerLayout fullName={fullName} userInitials={userInitials} userId={user.id}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
          <h1 className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>Settings</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>Coming soon</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[14px] font-medium mb-2" style={{ color: "#7a7060" }}>Not yet available</div>
            <div className="text-[12px]" style={{ color: "#4a4438" }}>Organisation settings are coming in a future update.</div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
}