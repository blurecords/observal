import { AppHeader } from "@/components/app/header";
import { AppSidebar } from "@/components/app/sidebar";
import { RoleProvider } from "@/components/app/role-context";
import { parseRole } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const role = parseRole(profile?.role);

  return (
    <RoleProvider role={role}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader
            title="Observal"
            userEmail={user?.email ?? undefined}
            roleLabel={ROLE_LABELS[role]}
          />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </RoleProvider>
  );
}
