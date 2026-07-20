import { createClient } from "@/lib/supabase/server";
import InviteClient from "./invite-client";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: inviteRaw } = await supabase.rpc("get_invite_public", {
    p_token: token,
  });

  const invite = inviteRaw as {
    email?: string;
    role?: string;
    accepted_at?: string | null;
    expires_at?: string;
  } | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InviteClient
      token={token}
      invite={invite}
      isLoggedIn={!!user}
      userEmail={user?.email}
    />
  );
}
