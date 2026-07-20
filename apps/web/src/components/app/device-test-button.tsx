"use client";

import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/components/app/role-context";
import { Loader2, PlugZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  deviceId: string;
  lastTestAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
};

export function DeviceTestButton({
  deviceId,
  lastTestAt,
  lastTestOk,
  lastTestMessage,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { canWrite } = useRole();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canWrite) return null;

  async function requestTest() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase
      .from("av_devices")
      .update({ test_requested_at: new Date().toISOString() })
      .eq("id", deviceId);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Prueba solicitada. El collector la ejecutará en el próximo ciclo.");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-card bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Probar conexión</h3>
          <p className="text-sm text-muted mt-1">
            El collector verificará el protocolo configurado en el siguiente poll.
          </p>
        </div>
        <button
          type="button"
          onClick={requestTest}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlugZap className="h-4 w-4" />
          )}
          Probar ahora
        </button>
      </div>

      {message && <p className="text-sm text-blue-300">{message}</p>}

      {lastTestAt && (
        <p className="text-sm">
          <span className={lastTestOk ? "text-green-400" : "text-red-400"}>
            {lastTestOk ? "Última prueba OK" : "Última prueba fallida"}
          </span>
          {" · "}
          {new Date(lastTestAt).toLocaleString("es-ES")}
          {lastTestMessage ? ` — ${lastTestMessage}` : ""}
        </p>
      )}
    </div>
  );
}
