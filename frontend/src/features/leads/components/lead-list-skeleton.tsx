import { Skeleton } from "@/components/ui/skeleton";
import { COPY } from "@/config/copy";

function RowSkeleton() {
  return (
    <li className="flex items-start gap-3 rounded-xl border bg-surface p-3 sm:px-4">
      <Skeleton className="size-9 rounded-full" />
      <div className="flex flex-1 flex-col gap-2 py-0.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="hidden h-3.5 w-24 sm:block" />
          <Skeleton className="ml-auto h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </li>
  );
}

function SectionSkeleton({ rows, subtitle = false }: { rows: number; subtitle?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        {subtitle ? <Skeleton className="h-3.5 w-36" /> : null}
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => (
          <RowSkeleton key={index} />
        ))}
      </ul>
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="flex gap-1.5 overflow-hidden" aria-hidden>
      {[56, 72, 96, 92, 120, 64, 64].map((width, index) => (
        <Skeleton key={index} className="h-10 shrink-0 rounded-full sm:h-8" style={{ width }} />
      ))}
    </div>
  );
}

export function FollowUpsSkeleton() {
  return <SectionSkeleton rows={2} subtitle />;
}

export function LeadRowsSkeleton() {
  return <SectionSkeleton rows={6} />;
}

export function LeadListSkeleton() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label={COPY.loading.leads}>
      <FiltersSkeleton />
      <FollowUpsSkeleton />
      <LeadRowsSkeleton />
    </div>
  );
}
