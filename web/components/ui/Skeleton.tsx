/** Skeleton blocks instead of spinners (docs/SPEC.md 4.0). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-card bg-surface-2 ${className}`} />;
}

export function ScreenSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  );
}
