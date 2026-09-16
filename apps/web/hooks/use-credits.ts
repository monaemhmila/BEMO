import { BACKEND_URL } from "../app/config";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "./useAuth";
import { creditUpdateEvent } from "@/hooks/usePayment";

export function useCredits() {
  const { getToken, isSignedIn } = useAuth();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  const fetchCredits = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }

    // Don't fetch if not signed in
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setError(null);
      const token = await getToken();
      
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/balance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!isMounted.current) return;

      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits ?? 0);
        setError(null);
      } else if (response.status === 401 || response.status === 403) {
        setError("Authentication failed - please sign in again");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || "Failed to fetch credits");
      }
    } catch {
      if (!isMounted.current) return;
      setError("Network error - please check your connection");
    } finally {
      fetchingRef.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    isMounted.current = true;

    // Only fetch if signed in
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchCredits();

    const handleCreditUpdate = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== undefined) {
        setCredits(event.detail);
      }
      // Refresh from server to ensure accuracy
      fetchCredits();
    };

    creditUpdateEvent.addEventListener("creditUpdate", handleCreditUpdate);

    // Refresh every 60 seconds
    const interval = setInterval(fetchCredits, 60 * 1000);

    return () => {
      isMounted.current = false;
      creditUpdateEvent.removeEventListener("creditUpdate", handleCreditUpdate);
      clearInterval(interval);
    };
  }, [isSignedIn, fetchCredits]);

  return { credits, loading, error, refetch: fetchCredits };
}