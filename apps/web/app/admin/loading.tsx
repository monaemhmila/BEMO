import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#0f0f11] p-6">
      <div className="mx-auto max-w-6xl pt-6">
        <PageSkeleton variant="dark" rows={4} />
      </div>
    </div>
  );
}