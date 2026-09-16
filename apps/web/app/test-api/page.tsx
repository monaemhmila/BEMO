"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { BACKEND_URL } from "../config";
import { Button } from "@/components/ui/button";

export default function TestApiPage() {
  const { getToken, isSignedIn } = useAuth();
  const [result, setResult] = useState<string>("");

  const testBalance = async () => {
    setResult("Testing /balance endpoint...\n");
    
    try {
      const token = await getToken();
      setResult((prev) => prev + `Token: ${token ? "✅ Received" : "❌ NULL"}\n`);
      setResult((prev) => prev + `Token length: ${token?.length || 0}\n`);
      setResult((prev) => prev + `Backend URL: ${BACKEND_URL}\n\n`);

      if (!token) {
        setResult((prev) => prev + "❌ Cannot proceed without token\n");
        return;
      }

      setResult((prev) => prev + "Calling /balance...\n");
      
      const response = await fetch(`${BACKEND_URL}/balance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setResult((prev) => prev + `Response status: ${response.status}\n`);
      setResult((prev) => prev + `Response ok: ${response.ok}\n\n`);

      const data = await response.json();
      setResult((prev) => prev + "Response data:\n" + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult((prev) => prev + `\n❌ ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
      setResult((prev) => prev + `Stack: ${error instanceof Error ? error.stack : "N/A"}\n`);
    }
  };

  const testModels = async () => {
    setResult("Testing /models endpoint...\n");
    
    try {
      const token = await getToken();
      setResult((prev) => prev + `Token: ${token ? "✅ Received" : "❌ NULL"}\n`);

      if (!token) {
        setResult((prev) => prev + "❌ Cannot proceed without token\n");
        return;
      }

      setResult((prev) => prev + "Calling /models...\n");
      
      const response = await fetch(`${BACKEND_URL}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setResult((prev) => prev + `Response status: ${response.status}\n`);
      setResult((prev) => prev + `Response ok: ${response.ok}\n\n`);

      const data = await response.json();
      setResult((prev) => prev + "Response data:\n" + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult((prev) => prev + `\n❌ ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">API Test Page</h1>
        
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <p>
            <strong>Signed In:</strong> {isSignedIn ? "✅ Yes" : "❌ No"}
          </p>
          <p>
            <strong>Backend:</strong> {BACKEND_URL}
          </p>
        </div>

        <div className="space-x-4 mb-6">
          <Button onClick={testBalance} disabled={!isSignedIn}>
            Test /balance
          </Button>
          <Button onClick={testModels} disabled={!isSignedIn} variant="outline">
            Test /models
          </Button>
        </div>

        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm whitespace-pre-wrap min-h-[400px]">
          {result || "Click a button to test..."}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Make sure you&apos;re signed in</li>
            <li>Open browser DevTools (F12) → Console tab</li>
            <li>Click &quot;Test /balance&quot; or &quot;Test /models&quot;</li>
            <li>Check both this window and the console for errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

