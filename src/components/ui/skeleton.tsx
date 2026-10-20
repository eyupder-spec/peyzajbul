import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md bg-muted motion-safe:animate-[skeleton-pulse_1.8s_ease-in-out_infinite]", className)}
      {...props}
    />
  );
}

/** FirmCard ile aynı geometriyi taşıyan yükleme iskeleti. */
function FirmCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Skeleton className="h-36 rounded-none" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, FirmCardSkeleton };
