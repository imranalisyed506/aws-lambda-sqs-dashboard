"use client";
import React from "react";
import { Button } from "@/components/ui/button";

interface SelfUpdateButtonProps {
  fn: any;
  profile: string;
  region: string;
  page: number;
  pageSize: number;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
  setLambdas: (lambdas: any[]) => void;
}

export function SelfUpdateButton({ fn, profile, region, page, pageSize, setSuccess, setError, setLambdas }: SelfUpdateButtonProps) {
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="primary"
      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow relative"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        setError("");
        setSuccess("");
        try {
          const res = await fetch("/api/lambdas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selfUpdate: true,
              functionName: fn.FunctionName,
              profile,
              region
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "SelfUpdate failed");
          setSuccess(`SelfUpdate triggered for ${fn.FunctionName}. Response: ${JSON.stringify(data)}`);
          // Re-fetch Lambdas after SelfUpdate
          try {
            const res2 = await fetch(`/api/lambdas?profile=${profile}&region=${region}&page=${page}&pageSize=${pageSize}`);
            if (!res2.ok) throw new Error("Failed to fetch Lambdas");
            const data2 = await res2.json();
            setLambdas(Array.isArray(data2.lambdas) ? data2.lambdas : []);
          } catch (err: any) {
            setLambdas([]);
            setError(err?.message || "Failed to load Lambdas after SelfUpdate.");
          }
        } catch (err: any) {
          setError(err?.message || "Failed to trigger SelfUpdate.");
        }
        setLoading(false);
      }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          Loading...
        </span>
      ) : (
        "SelfUpdate"
      )}
    </Button>
  );
}
