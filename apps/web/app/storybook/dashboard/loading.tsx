import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageSkeleton rows={3} />
    </div>
  );
}