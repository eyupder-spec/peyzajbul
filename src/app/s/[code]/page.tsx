import { cache } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import FirmaSahiplen, { type ClaimPreview } from "@/views/FirmaSahiplen";

// The claim link is a private, per-firm capability: never cached, never indexed. The click is NOT logged here,
// because link-preview crawlers (WhatsApp, facebookexternalhit) render this page too; the client component logs it.
export const dynamic = "force-dynamic";

const CODE_PATTERN = /^[2-9a-hj-km-np-z]{10}$/;
const NO_INDEX = { index: false, follow: false } as const;

interface PreviewResult {
  preview: ClaimPreview | null;
  /** The lookup itself failed (for example the claim migrations are not applied yet), as opposed to an unknown code. */
  unavailable: boolean;
}

const loadPreview = cache(async (code: string): Promise<PreviewResult> => {
  if (!CODE_PATTERN.test(code)) return { preview: null, unavailable: false };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("claim_preview", { p_code: code });
    if (error) return { preview: null, unavailable: true };
    return { preview: (data as ClaimPreview | null) ?? null, unavailable: false };
  } catch {
    return { preview: null, unavailable: true };
  }
});

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const { preview } = await loadPreview(code);
  if (!preview) return { title: "Bağlantı geçersiz | Peyzajbul", robots: NO_INDEX };

  const title = `${preview.company_name} profiliniz yayında | Peyzajbul`;
  const description = "Profilinizi 2 dakikada sahiplenin.";
  return {
    title,
    description,
    robots: NO_INDEX,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Peyzajbul",
      locale: "tr_TR",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Peyzajbul" }],
    },
  };
}

export default async function ClaimLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { preview, unavailable } = await loadPreview(code);
  return <FirmaSahiplen preview={preview} code={preview ? code : undefined} unavailable={unavailable} />;
}
