import { Suspense } from "react";
import { Metadata } from "next";
import FirmaPremiumClient from "@/views/FirmaPremium";

export const metadata: Metadata = {
  title: "Pro Üyelik | Peyzajbul",
  robots: { index: false, follow: false },
};

export default function FirmaPremiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      }
    >
      <FirmaPremiumClient />
    </Suspense>
  );
}
