import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function NewStoryLoading() {
  return (
    <div className="min-h-screen bg-[#faf9f6] px-4 pt-28 pb-20">
      <div className="mx-auto max-w-4xl">
        <PageSkeleton rows={2} />
      </div>
    </div>
  );
}