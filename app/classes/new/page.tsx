import { getServerClient, requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PageContainer, PageHeader } from "@/components/shell/page";
import NewClassForm from "./NewClassForm";

export default async function NewClassPage() {
  const user = await requireAuth();
  const supabase = await getServerClient();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? "";
  const userInitials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppShell
      mode="dashboard"
      tutorInitials={userInitials}
      tutorName={fullName}
      role="tutor"
      breadcrumb={{ root: "Classes", leaf: "New class" }}
    >
      <PageContainer className="max-w-[760px]">
        <PageHeader
          title="Create a class"
          sub="Set up a new session space for your student."
        />
        <NewClassForm />
      </PageContainer>
    </AppShell>
  );
}
