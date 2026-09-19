"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BACKEND_URL } from "../app/config";

const TRACK_ENDPOINT = `${BACKEND_URL}/analytics/track`;
const SESSION_KEY = "mph_session";

interface TrackPayload {
  eventType: "visit" | "click";
  path: string;
  label?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
}

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function sendEvent(payload: TrackPayload) {
  try {
    const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, body);
    } else {
      void fetch(TRACK_ENDPOINT, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    // Tracking must never break the page.
  }
}

/**
 * Lightweight, cookie-free analytics. Fires a "visit" event on every route
 * change and captures clicks on links / [data-track] elements. Events are
 * sent with sendBeacon to the backend /analytics/track endpoint.
 */
export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Page visits
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    sendEvent({ eventType: "visit", path: pathname, sessionId: getSessionId() });
  }, [pathname]);

  // Clicks on links & marked buttons (capture phase, so it also catches
  // elements that stop propagation).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest) return;
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/admin")) return;

      const el = target.closest<HTMLElement>("[data-track], a[href]");
      if (!el) return;

      let label: string | null = null;
      let referrer: string | null = null;
      if (el.hasAttribute("data-track")) {
        label = el.getAttribute("data-track");
      } else if (el.tagName === "A") {
        referrer = (el as HTMLAnchorElement).href || null;
        const text = (el.textContent || "").trim().slice(0, 80);
        label = text || "nav_link";
      }

      sendEvent({
        eventType: "click",
        path: currentPath,
        label,
        referrer,
        sessionId: getSessionId(),
      });
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return children;
}