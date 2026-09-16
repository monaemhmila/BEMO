"use client";

import { useParams } from "next/navigation";
import { StoryViewer } from "@/features/storybook";

export default function StoryReaderPage() {
  const { id } = useParams<{ id: string }>();

  return <StoryViewer storyId={id} />;
}
