import { Metadata } from "next";
import LegacyRedirect from "./LegacyRedirect";

export const metadata: Metadata = {
  title: "Talebiniz - Peyzajbul",
  robots: { index: false, follow: false },
};

// Old confirmation URL, kept so bookmarks and in-flight sessions still land somewhere useful.
export default function TalebinizAlindiPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <LegacyRedirect />
      <noscript>
        <a href="/teklif-al" className="text-primary underline underline-offset-2">
          Teklif formuna gitmek için tıklayın
        </a>
      </noscript>
    </main>
  );
}
