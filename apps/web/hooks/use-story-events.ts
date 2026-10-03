import { useEffect } from "react";
import { BACKEND_URL } from "../app/config";

export function useStoryEvents<T>(storyId: string, getToken: (() => Promise<string | null>) | undefined, onStory: (story: T) => void, onLoadingDone: () => void) {
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getToken?.();
        if (!token) return;
        const response = await fetch(`${BACKEND_URL}/story/events/${storyId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`Story stream failed: ${response.status}`);
        onLoadingDone();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
            if (!data || data === "{}") continue;
            const parsed = JSON.parse(data) as { story?: T };
            if (parsed.story) onStory(parsed.story);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error("Failed to consume story status stream", error);
        onLoadingDone();
      }
    })();
    return () => controller.abort();
  }, [storyId, getToken, onStory, onLoadingDone]);
}
