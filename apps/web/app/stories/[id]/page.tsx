"use client";

import { useParams } from "next/navigation";
import { StoryBookReader } from "@/features/storybook";

export default function StoryPage() {
  const params = useParams<{ id: string }>();
  const storyId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!storyId) return null;

  return <StoryBookReader storyId={storyId} />;
}

