import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function PurchasesLoading() {
  return (
    <div className="min-h-screen bg-[#faf9f6] px-4 pt-28 pb-20">
      <div className="mx-auto max-w-5xl">
        <PageSkeleton rows={4} />
      </div>
    </div>
  );
}