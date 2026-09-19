import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function StoriesLoading() {
  return (
    <div className="min-h-screen bg-paper px-4 pt-28 pb-20">
      <div className="mx-auto max-w-6xl">
        <PageSkeleton rows={6} />
      </div>
    </div>
  );
}