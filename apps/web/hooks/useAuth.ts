import { useCallback } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";

/**
 * JWT Template name configured in Clerk Dashboard (JWT Templates page).
 * If you haven't created one yet:
 * 1. Go to dashboard.clerk.com → your project → JWT Templates
 * 2. Click "New template" → name it "backend" → Save
 * 3. Copy the public key to your backend's CLERK_JWT_PUBLIC_KEY env var
 * 
 * If no template exists, we fall back to undefined which uses Clerk's
 * default session token (works if backend uses Clerk SDK directly).
 */
const JWT_TEMPLATE = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE || undefined;

export function useAuth() {
  const { getToken: clerkGetToken, isSignedIn } = useClerkAuth();
  const { isLoaded, user } = useUser();

  /**
   * Get a JWT token for API calls.
   * - If JWT_TEMPLATE is set, requests that specific template
   * - Otherwise uses default Clerk session token
   */
  const getToken = useCallback(
    async (options?: Parameters<typeof clerkGetToken>[0]) => {
      try {
        const token = await clerkGetToken({
          ...options,
          template: options?.template ?? JWT_TEMPLATE,
        });
        
        if (!token && isSignedIn) {
          console.warn("[useAuth] No token returned despite being signed in");
        }
        
        return token;
      } catch (error) {
        console.error("[useAuth] Failed to get token:", error);
        return null;
      }
    },
    [clerkGetToken, isSignedIn]
  );

  return {
    isAuthenticated: !!isSignedIn,
    user,
    isLoaded,
    isSignedIn,
    userId: user?.id || null,
    getToken,
  };
}