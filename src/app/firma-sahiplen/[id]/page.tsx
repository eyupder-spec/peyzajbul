import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import FirmaSahiplen, { type ClaimPreview } from "@/views/FirmaSahiplen";

// Entry of the "Bu sizin firmanız mı?" button on an unclaimed profile. Per-firm and form-like: never indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Firma Sahiplen | Peyzajbul",
  robots: { index: false, follow: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FirmaSahiplenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return <FirmaSahiplen preview={null} />;

  let preview: ClaimPreview | null = null;
  let unavailable = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("claim_preview", { p_firm_id: id });
    if (error) unavailable = true;
    else preview = (data as ClaimPreview | null) ?? null;
  } catch {
    unavailable = true;
  }

  return <FirmaSahiplen preview={preview} firmId={preview ? id : undefined} unavailable={unavailable} />;
}
