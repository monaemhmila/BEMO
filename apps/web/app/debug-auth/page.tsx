"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTrials } from "@/hooks/use-trials";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TokenInfo {
  exists: boolean;
  length?: number;
  payload?: Record<string, unknown>;
  error?: string;
}

interface ApiTestResult {
  loading?: boolean;
  ok?: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

/**
 * Debug page to test authentication and API connectivity
 * Access at: http://localhost:3000/debug-auth
 */
export default function DebugAuthPage() {
  const auth = useAuth();
  const { getToken } = auth;
  const { trials, loading: trialsLoading, error: trialsError } = useTrials();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [apiTests, setApiTests] = useState<Record<string, ApiTestResult>>({});

  const checkToken = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        // Decode JWT to inspect (don't do this in production!)
        const parts = token.split(".");
        const payload = parts.length > 1 ? JSON.parse(atob(parts[1] as string)) : {};
        setTokenInfo({
          exists: true,
          length: token.length,
          payload,
        });
      } else {
        setTokenInfo({ exists: false });
      }
    } catch (error) {
      setTokenInfo({ exists: false, error: String(error) });
    }
  }, [getToken]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  const testEndpoint = async (name: string, endpoint: string) => {
    try {
      setApiTests((prev) => ({ ...prev, [name]: { loading: true } }));
      const token = await auth.getToken();
      
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      setApiTests((prev) => ({
        ...prev,
        [name]: {
          loading: false,
          status: response.status,
          ok: response.ok,
          data,
        },
      }));
    } catch (error) {
      setApiTests((prev) => ({
        ...prev,
        [name]: {
          loading: false,
          error: String(error),
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Authentication Debug Panel</h1>
          <p className="text-gray-600">
            Diagnose auth and API connectivity issues
          </p>
        </div>

        {/* Auth Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Auth Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Is Signed In:</span>
              <Badge variant={auth.isSignedIn ? "default" : "destructive"}>
                {auth.isSignedIn ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Is Loaded:</span>
              <Badge variant={auth.isLoaded ? "default" : "secondary"}>
                {auth.isLoaded ? "Yes" : "Loading..."}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>User ID (Clerk):</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {auth.userId || "null"}
              </code>
            </div>
            <div className="flex justify-between">
              <span>User Email:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {auth.user?.primaryEmailAddress?.emailAddress || "null"}
              </code>
            </div>
          </div>
        </Card>

        {/* Token Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">JWT Token</h2>
          <Button onClick={checkToken} className="mb-4" size="sm">
            Refresh Token Info
          </Button>
          
          {tokenInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Token Exists:</span>
                <Badge variant={tokenInfo.exists ? "default" : "destructive"}>
                  {tokenInfo.exists ? "Yes" : "No"}
                </Badge>
              </div>
              {tokenInfo.exists && (
                <>
                  <div className="flex justify-between">
                    <span>Token Length:</span>
                    <code className="text-sm">{tokenInfo.length} chars</code>
                  </div>
                  <div>
                    <span className="font-medium">Payload:</span>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(tokenInfo.payload, null, 2)}
                    </pre>
                  </div>
                </>
              )}
              {tokenInfo.error && (
                <div className="text-red-600 text-sm">{tokenInfo.error}</div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Click &quot;Refresh Token Info&quot; to check</p>
          )}
        </Card>

        {/* Trials Hook */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Free Stories Hook</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Loading:</span>
              <Badge variant={trialsLoading ? "secondary" : "default"}>
                {trialsLoading ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Free stories left:</span>
              <code className="text-lg font-bold">{trials}</code>
            </div>
            {trialsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 text-sm font-medium">Error:</p>
                <p className="text-red-700 text-sm">{trialsError}</p>
              </div>
            )}
          </div>
        </Card>

        {/* API Endpoints Test */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test API Endpoints</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Backend URL:</span>
              <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">
                {BACKEND_URL}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => testEndpoint("balance", "/balance")}
                disabled={!auth.isSignedIn}
                variant="outline"
              >
                Test /balance
              </Button>
              <Button
                onClick={() => testEndpoint("models", "/models")}
                disabled={!auth.isSignedIn}
                variant="outline"
              >
                Test /models
              </Button>
            </div>

            {Object.entries(apiTests).map(([name, result]) => (
              <div key={name} className="p-3 bg-gray-50 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">/{name}</span>
                  {result.loading ? (
                    <Badge variant="secondary">Loading...</Badge>
                  ) : result.ok ? (
                    <Badge variant="default">Success ({result.status})</Badge>
                  ) : (
                    <Badge variant="destructive">
                      Error ({result.status || "Network"})
                    </Badge>
                  )}
                </div>
                {result.data ? (
                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                ) : null}
                {result.error && (
                  <div className="mt-2 text-red-600 text-sm">{result.error}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Environment Check */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Config</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Backend URL:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{BACKEND_URL}</code>
            </div>
            <div className="flex justify-between">
              <span>JWT Template:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE || "(not set)"}
              </code>
            </div>
            <div className="flex justify-between">
              <span>Clerk Publishable Key:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                  ? `${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.slice(0, 20)}...`
                  : "(not set)"}
              </code>
            </div>
          </div>
        </Card>

        {/* Browser Console Tip */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">💡 Check Browser Console</h3>
          <p className="text-sm text-gray-700">
            Open DevTools (F12) → Console tab to see detailed error messages from
            the frontend.
          </p>
        </Card>
      </div>
    </div>
  );
}

