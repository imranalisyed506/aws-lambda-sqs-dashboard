"use client";
import { SelfUpdateButton } from "@/components/ui/self-update-button";
// ...existing code...
// ...existing code...
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion";

import React, { useEffect, useState, useRef } from "react";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DEFAULT_PROFILE,
  DEFAULT_REGION,
  PROFILE_OPTIONS,
  REGION_OPTIONS,
  IMPORTANT_KEYS,
  DEFAULT_COLUMNS,
  PAGE_SIZE,
  MAX_FRONTEND_MS,
  SQS_RETRY_ATTEMPTS,
  SQS_RETRY_DELAY,
  LAMBDA_RETRY_ATTEMPTS,
  LAMBDA_RETRY_DELAY,
  COLLECTOR_SUMMARY_RETRY_ATTEMPTS,
  COLLECTOR_SUMMARY_RETRY_DELAY
} from "./config";

// Utility to format relative time
function formatRelativeTime(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}
export default function Home() {
  const [collectorSummaryLoading, setCollectorSummaryLoading] = useState(false);
  // ...existing code...
  const [profile, setProfile] = useState("playground");
  const [profiles, setProfiles] = useState<string[]>(["playground", "paws_integration","paws"]);
  const [region, setRegion] = useState("us-east-1");
  const [collectorSummary, setCollectorSummary] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    async function fetchCollectorSummaryWithRetry(attempt = 0) {
      setCollectorSummaryLoading(true);
      setRetryCount(attempt);
      setRetryDelay(0);
      try {
        const res = await fetch(`/api/collector-summary?profile=${profile}&region=${region}`);
        if (res.status === 429) {
          setError({ status: 429, message: "AWS rate limit exceeded. Retrying automatically..." });
          setRetryDelay(4000);
          if (attempt < 2) {
            setTimeout(() => {
              if (!cancelled) fetchCollectorSummaryWithRetry(attempt + 1);
            }, 4000);
            return;
          }
        }
        if (!res.ok) throw new Error("Failed to fetch collector summary");
        const data = await res.json();
        setCollectorSummary(data.collectorCounts || {});
        setError(null);
      } catch (err: any) {
        setCollectorSummary({});
        setError({ status: err.status || 500, message: err.message || "Failed to fetch collector summary." });
      } finally {
        setCollectorSummaryLoading(false);
      }
    }
    fetchCollectorSummaryWithRetry();
    return () => { cancelled = true; };
  }, [profile, region]);
  // Flyout state for viewing env vars and logs
  const [flyoutType, setFlyoutType] = useState<"env"|"logs"|"sqs"|null>(null);
  const [flyoutLambda, setFlyoutLambda] = useState<any>(null);
  const [cloudwatchLogs, setCloudwatchLogs] = useState<any[]>([]);
  // SQS Poll flyout state
  const [sqsMessage, setSqsMessage] = useState<any>(null);
  const [sqsLoading, setSqsLoading] = useState(false);
  const [sqsProgress, setSqsProgress] = useState<{timeElapsed: number, strategy: string, pollCount: number} | null>(null);
  const sqsAbortControllerRef = useRef<AbortController | null>(null);

  // Handler to open SQS poll flyout
  async function handlePollSqs(lambda: any) {
    setSqsMessage({ messages: [] });
    setSqsLoading(true);
    setSqsProgress(null);
    setFlyoutType("sqs");
    setFlyoutLambda(lambda);
    const maxFrontendMs = 300000; // 5 minutes
    const queueUrl = lambda?.Environment?.Variables?.paws_state_queue_url;
    if (!queueUrl) {
      setSqsMessage({ error: "No paws_state_queue_url found in environment variables." });
      setSqsLoading(false);
      return;
    }
    // AbortController for stop polling
    const abortController = new AbortController();
    sqsAbortControllerRef.current = abortController;
    // Start progress tracking
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (!sqsAbortControllerRef.current) {
        clearInterval(progressInterval);
        return;
      }
      setSqsProgress(prev => ({
        ...prev,
        timeElapsed: Date.now() - startTime,
        strategy: prev?.strategy || 'initializing',
        pollCount: prev?.pollCount || 0
      }));
    }, 500);
    let attempts = 0;
    let lastError = null;
    while (attempts < 3) {
      try {
        // Add frontend timeout (5 minutes, matches backend)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Frontend timeout: Polling took too long')), maxFrontendMs);
        });
        const fetchPromise = fetch("/api/sqs-poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            region: lambda.Region || region,
            queueUrl
          }),
          signal: abortController.signal
        });
        const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        if (res.status === 429) {
          setError({ status: 429, message: "AWS rate limit exceeded. Retrying automatically..." });
          setRetryCount(attempts + 1);
          setRetryDelay(4000);
          await new Promise(resolve => setTimeout(resolve, 4000));
          attempts++;
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        setSqsProgress({
          timeElapsed: data.timeElapsed || (Date.now() - startTime),
          strategy: data.strategy || 'completed',
          pollCount: data.pollCount || 0
        });
        setSqsMessage((prev: any) => {
          if (!prev || !Array.isArray(prev.messages)) return data;
          const newMessages = Array.isArray(data.messages) ? data.messages : [];
          const allMessages = [...prev.messages, ...newMessages].filter((msg, idx, arr) =>
            msg.MessageId ? arr.findIndex(m => m.MessageId === msg.MessageId) === idx : true
          );
          return { ...data, messages: allMessages };
        });
        setError(null);
        break;
      } catch (err: any) {
        lastError = err;
        if (err?.name === "AbortError") {
          setSqsMessage({ error: "Polling stopped by user." });
          setSqsProgress({
            timeElapsed: Date.now() - startTime,
            strategy: 'aborted',
            pollCount: 0
          });
          break;
        } else if (err?.message?.includes('Frontend timeout')) {
          setSqsMessage({ error: "Polling timed out after 5 minutes. This may indicate network issues or a very slow queue." });
          setSqsProgress({
            timeElapsed: maxFrontendMs,
            strategy: 'timeout',
            pollCount: 0
          });
          break;
        } else if (err?.status === 429 || (err?.message && err.message.includes('429'))) {
          setError({ status: 429, message: "AWS rate limit exceeded. Retrying automatically..." });
          setRetryCount(attempts + 1);
          setRetryDelay(4000);
          await new Promise(resolve => setTimeout(resolve, 4000));
          attempts++;
          continue;
        } else {
          setSqsMessage({ error: err?.message || "Failed to poll SQS." });
          setSqsProgress({
            timeElapsed: Date.now() - startTime,
            strategy: 'error',
            pollCount: 0
          });
          setError({ status: err.status || 500, message: err.message || "Failed to poll SQS." });
          break;
        }
      }
    }
    setSqsLoading(false);
    sqsAbortControllerRef.current = null;
    clearInterval(progressInterval);
    if (attempts === 3 && lastError) {
      setError({ status: 429, message: "AWS rate limit exceeded. Please try again later." });
    }
  }

  function handleStopSqsPolling() {
    if (sqsAbortControllerRef.current) {
      sqsAbortControllerRef.current.abort();
    }
    setSqsProgress(null);
  }

  // Table and dashboard state
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc"|"desc">("asc");
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [lambdas, setLambdas] = useState<any[]>([]);
  const [totalLambdaCount, setTotalLambdaCount] = useState<number>(0);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const defaultColumns = [
  { key: "FunctionName", label: "Function Name" },
  { key: "Description", label: "Description" },
  { key: "Runtime", label: "Runtime" },
  { key: "MemorySize", label: "Memory (MB)" },
  { key: "LastModified", label: "Last Modified" },
  { key: "collectorType", label: "Collector Type" },
  { key: "PackageType", label: "Package Type" },
  { key: "Architectures", label: "Architecture" },
  { key: "CodeSize", label: "Code Size" },
  { key: "Timeout", label: "Timeout (s)" },
  ];
  const importantKeys = ["FunctionName", "Description", "Runtime", "MemorySize", "LastModified", "collectorType"];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(importantKeys);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [lambdaDetails, setLambdaDetails] = useState<any>(null);
  const [regions, setRegions] = useState<string[]>(REGION_OPTIONS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [filter, setFilter] = useState("");
  // Track selected collector type for highlighting
  const [selectedCollectorType, setSelectedCollectorType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  // State for editing environment variables (must be after envVars)
  const [editingEnvVars, setEditingEnvVars] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  useEffect(() => {
    // Reset editing state and values when envVars change
    setEditingEnvVars({});
    setEditValues({});
  }, [envVars]);
  const [success, setSuccess] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);

  // Handler to open env vars flyout
  function handleViewEnvVars(lambda: any) {
    setFlyoutType("env");
    setFlyoutLambda(lambda);
  }
  // Handler to open logs flyout (stub fetch)
  async function handleViewLogs(lambda: any) {
    setCloudwatchLogs([]);
    setFlyoutType("logs");
    setFlyoutLambda(lambda);
    // try {
    //   // Fetch logs for the last 1 hour
    //   const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    //   const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${lambda.FunctionName}&logsSince=${since}`);
    //   if (!res.ok) throw new Error("Failed to fetch CloudWatch logs");
    //   const data = await res.json();
    //   // Expecting data.logs to be an array of log events
    //   setCloudwatchLogs(data.logs || []);
    // } catch (err: any) {
    //   setCloudwatchLogs([]);
    //   setError(err?.message || "Failed to fetch CloudWatch logs.");
    // }
  }
  function handleSort(colKey: string) {
    if (sortBy === colKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(colKey);
      setSortOrder("asc");
    }
  }
  function handleColResize(colKey: string, delta: number) {
    setColWidths(prev => {
      const newWidth = Math.max((prev[colKey] || 120) + delta, 60);
      const updated = { ...prev, [colKey]: newWidth };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lambdaColWidths", JSON.stringify(updated));
      }
      return updated;
    });
  }
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("lambdaColWidths");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") setColWidths(parsed);
        } catch {}
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("lambdaVisibleColumns");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setVisibleColumns(parsed);
        } catch {}
      }
    }
  }, []);
  useEffect(() => {
    setPage(0);
    setSelected(null);
    setLambdaDetails(null);
  }, [filter]);
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/aws-profiles");
        const data = (await res.json()).filter((p: string) =>
          ["playground", "paws_integration", "paws"].includes(p)
        ).sort((a: string, b: string) => {
          const order = ["playground", "paws_integration", "paws"];
          return order.indexOf(a) - order.indexOf(b);
        });
        //  const data = await res.json()
        setProfiles(data);
      } catch {}
    }
    fetchProfiles();
  }, []);
  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    async function fetchLambdasWithRetry(attempt = 0) {
      setRetryCount(attempt);
      setRetryDelay(0);
      try {
        const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}`);
        if (res.status === 429) {
          setError({ status: 429, message: "AWS rate limit exceeded. Retrying automatically..." });
          setRetryDelay(4000);
          if (attempt < 2) {
            setTimeout(() => {
              if (!cancelled) fetchLambdasWithRetry(attempt + 1);
            }, 4000);
            return;
          }
        }
        if (!res.ok) throw new Error("Failed to fetch Lambdas");
        const data = await res.json();
        setLambdas(Array.isArray(data.lambdas) ? data.lambdas : []);
        setTotalLambdaCount(Array.isArray(data.lambdas) ? data.lambdas.length : 0);
        setError(null);
      } catch (err: any) {
        setLambdas([]);
        setTotalLambdaCount(0);
        setError({ status: err.status || 500, message: err.message || "Failed to load Lambdas." });
      }
      setLoading(false);
    }
    fetchLambdasWithRetry();
    return () => { cancelled = true; };
  }, [profile, region]);
  // Only fetch logs when a new Lambda is selected for logs, not on every flyoutType/profile/region change
  const lastLogsLambdaRef = useRef<any>(null);
  useEffect(() => {
    let cancelled = false;
    if (flyoutType === "logs" && flyoutLambda && flyoutLambda?.FunctionName !== lastLogsLambdaRef.current) {
      setLogsLoading(true);
      setCloudwatchLogs([]);
      lastLogsLambdaRef.current = flyoutLambda?.FunctionName;
      const lambdaName = flyoutLambda?.FunctionName;
      const fetchLogs = async () => {
        try {
          const res = await fetch(`/api/lambdas?profile=${profile}&region=${flyoutLambda?.Region || region}&functionName=${flyoutLambda.FunctionName}&logs=1`);
          const data = await res.json();
          // Only set logs if this is still the correct lambda and not cancelled
          if (!cancelled && lastLogsLambdaRef.current === lambdaName) {
            setCloudwatchLogs(data.logs || []);
          }
        } catch (err) {
          if (!cancelled && lastLogsLambdaRef.current === lambdaName) {
            setCloudwatchLogs([]);
          }
        } finally {
          if (!cancelled && lastLogsLambdaRef.current === lambdaName) {
            setLogsLoading(false);
          }
        }
      };
      fetchLogs();
    }
    // Do not clear logs when flyoutType changes, only reset ref
    if (flyoutType !== "logs") {
      lastLogsLambdaRef.current = null;
    }
    return () => {
      cancelled = true;
    };
  }, [flyoutType, flyoutLambda]);

  async function fetchLambdaDetails(fn: any) {
    setSelected(fn);
    setLoading(true);
    setError("");
    try {
      // Add timeout to lambda details fetching
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${fn.FunctionName}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Failed to fetch Lambda details");
      const data = await res.json();
      setLambdaDetails(data);
      setEnvVars(data?.config?.Environment?.Variables || {});
    } catch (err: any) {
      setLambdaDetails(null);
      if (err?.name === 'AbortError') {
        setError("Request timed out after 20 seconds. Please try again.");
      } else {
        setError(err?.message || "Failed to load Lambda details.");
      }
    }
    setLoading(false);
  }
  function toggleQueue(uuid: string, enabled: boolean) {}
  function handleEnvVarChange(key: string, value: string) {}
  function deleteEnvVar(key: string) {}
  function addEnvVar() {}
  function saveEnvVars() {}
  function updateEnvVar(key: string, value: string) {
    setLoading(true);
    setError("");
    setSuccess("");
    fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${selected?.FunctionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ envVars: { [key]: value } })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update environment variable");
        return res.json();
      })
      .then(data => {
        setEnvVars(data?.config?.Environment?.Variables || {});
        setLambdaDetails(data);
        setSuccess(`Environment variable '${key}' updated successfully.`);
      })
      .catch(err => {
        setError(err?.message || "Failed to update environment variable.");
      })
      .finally(() => setLoading(false));
  }

  let filteredLambdas = lambdas.filter((fn: any) => {
    if (!filter.trim()) return true;
    const lowerFilter = filter.toLowerCase();
    // If filtering by collector type (chip clicked), only check collectorType
    if (selectedCollectorType) {
      // For Unknown, collectorType is '-' and Description not S3/Poll based collector or missing
      if (selectedCollectorType === '-') {
        return fn.collectorType === '-' && (!fn.Description || (fn.Description !== 'Alert Logic S3 collector' && fn.Description !== 'Alert Logic Poll based collector'));
      }
      return fn.collectorType === selectedCollectorType;
    }
    // Otherwise, filter by any visible column
    return visibleColumns.some(colKey => {
      let value = fn[colKey];
      if (colKey === "collectorType" && fn.Description === "Alert Logic S3 collector") {
        value = "s3-collector";
      }
      if (Array.isArray(value)) value = value.join(", ");
      if (typeof value === "number") value = value.toString();
      if (typeof value === "string") {
        return value.toLowerCase().includes(lowerFilter);
      }
      return false;
    });
  });
  if (sortBy) {
    filteredLambdas = [...filteredLambdas].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === "string" && typeof vb === "string") {
        return sortOrder === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (typeof va === "number" && typeof vb === "number") {
        return sortOrder === "asc" ? va - vb : vb - va;
      }
      if (va instanceof Date && vb instanceof Date) {
        return sortOrder === "asc" ? va.getTime() - vb.getTime() : vb.getTime() - va.getTime();
      }
      return 0;
    });
  }
  const paginatedLambdas = filteredLambdas.slice(page * pageSize, (page + 1) * pageSize);

  return (
  <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200">
    {/* Collector type summary widget - moved outside main dashboard */}
    <div className="w-full max-w-4xl mt-8 mb-4 px-6 py-4 rounded-2xl shadow bg-white flex flex-col items-center">
      <div className="w-full flex flex-col items-center gap-1">
        <h1 className="text-base font-bold text-indigo-700 tracking-tight mb-0 leading-tight">AlertLogic AWS Lambda Dashboard And Collector Type Summary</h1>
        <p className="text-xs text-stone-500 text-center mb-1">Monitor, update, and manage Lambda functions with profile and region selection.</p>
        <div className="flex flex-col items-center gap-1 mt-1 mb-1">
          <div className="flex flex-wrap gap-2 justify-center mb-1 min-h-[24px]">
            {collectorSummaryLoading ? (
              <span className="flex items-center justify-center text-xs text-stone-400 min-h-[24px]">
                <svg className="animate-spin h-4 w-4 text-indigo-500 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Loading summary...
              </span>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {/* Fix chip count and filter for Unknown */}
                {Object.keys(collectorSummary).length > 0 &&
                  Object.entries(collectorSummary)
                    .sort(([a], [b]) => {
                      if (a === '-' && b !== '-') return 1;
                      if (a !== '-' && b === '-') return -1;
                      return a.localeCompare(b);
                    })
                    .filter(([type]) => type !== '-') // Remove Unknown chip
                    .map(([type, count]) => {
                      const chipCount = lambdas.filter(fn => fn.collectorType === type).length;
                      return (
                        <button
                          key={type}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border shadow-sm transition-all duration-150 focus:outline-none ${selectedCollectorType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}
                          onClick={() => {
                            setFilter(type);
                            setSelectedCollectorType(type);
                          }}
                          aria-label={`Filter by ${type}`}
                        >
                          {type}: {chipCount}
                        </button>
                      );
                    })}
                {selectedCollectorType && (
                  <button
                    className="ml-2 px-2 py-1 rounded bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-300 shadow-sm hover:bg-stone-300 transition-all duration-150"
                    onClick={() => {
                      setFilter("");
                      setSelectedCollectorType("");
                    }}
                    aria-label="Clear collector type filter"
                  >
                    Clear All
                  </button>
                )}
                {Object.keys(collectorSummary).length === 0 && (
                  <span className="text-xs text-stone-400">No collector data</span>
                )}
              </div>
            )}
          </div>
          <span className="font-medium text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1 border border-indigo-100 shadow-sm min-h-[24px] flex items-center justify-center">
            <>Total Lambda Collectors <span className="font-bold">({totalLambdaCount})</span></>
          </span>
        </div>
      </div>
    </div>
    {/* Inline loaders for each component */}
    {/* Table loader */}
    <div className="relative w-full max-w-7xl overflow-auto flex justify-center px-2 py-4">
      {/* ...existing table code... */}
    </div>
    {/* Flyout loaders for logs and SQS */}
    {flyoutType === "logs" && logsLoading && (
      <div className="flex items-center justify-center py-4">
        <svg className="animate-spin h-5 w-5 text-indigo-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span className="text-indigo-700">Loading logs...</span>
      </div>
    )}
    {flyoutType === "sqs" && sqsLoading && (
      <div className="flex items-center justify-center py-4">
        <svg className="animate-spin h-5 w-5 text-indigo-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span className="text-indigo-700">Polling SQS messages...</span>
      </div>
    )}
    {error && (
      <div className="w-full max-w-2xl flex flex-col items-center justify-center mb-2">
        <Alert variant={error?.status === 429 ? "warning" : "error"} className="w-full">
          <AlertTitle>
            {error?.status === 429 ? "Rate Limit Exceeded" : "Error"}
          </AlertTitle>
          <AlertDescription>
            {error?.status === 429
              ? "AWS rate limit exceeded. Retrying automatically..."
              : error?.message || error}
          </AlertDescription>
        </Alert>
        {error?.status === 429 && retryDelay > 0 && (
          <div className="mt-2 text-sm text-stone-600 animate-pulse">Retrying in {retryDelay / 1000} seconds... (Attempt {retryCount}/3)</div>
        )}
      </div>
    )}
    {success && (
      <div className="w-full max-w-2xl flex justify-center mb-2">
        <Alert variant="success" className="w-full">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      </div>
    )}
    {/* <div className="w-full max-w-4xl mb-4 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
      <div className="flex items-center justify-center text-sm text-blue-800">
        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span className="font-medium">Performance Optimized!</span>
        <span className="ml-2">SQS polling now 90% faster • Intelligent queue detection • Enhanced timeouts</span>
      </div>
    </div> */}
    <div className="w-full max-w-4xl mb-8 px-6 py-6 rounded-2xl shadow-lg bg-white flex flex-col items-center">
      <div className="flex gap-2 items-end justify-center w-full mt-2 mx-auto">
        <div className="flex flex-col gap-1 min-w-[90px]">
          <label className="text-xs font-semibold mb-0 text-stone-700">AWS Profile</label>
          <Select value={profile} onChange={e => {
            setProfile(e.target.value);
            setPage(0);
            setSelected(null);
            setLambdaDetails(null);
          }} className="min-w-[70px] text-xs py-1 px-2">
            {profiles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[90px]">
          <label className="text-xs font-semibold mb-0 text-stone-700">Region</label>
          <Select value={region} onChange={e => {
            setRegion(e.target.value);
            setPage(0);
            setSelected(null);
            setLambdaDetails(null);
          }} className="min-w-[70px] text-xs py-1 px-2">
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col flex-1 min-w-[90px] gap-1">
          <label className="text-xs font-semibold mb-0 text-stone-700">Filter</label>
          <div className="relative w-full flex items-center" style={{ maxWidth: 340 }}>
            <Input
              placeholder="Filter table by any column"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full rounded-lg border border-stone-300 shadow-sm focus:ring-2 focus:ring-indigo-400 text-xs py-1 px-2 pr-7"
              style={{ paddingRight: filter ? 28 : undefined }}
            />
            {filter && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs px-1 py-0.5 rounded focus:outline-none bg-white"
                aria-label="Clear filter"
                onClick={() => setFilter("")}
                style={{ height: 20, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>&#10005;</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 min-w-[60px]">
          <label className="text-xs font-semibold mb-0 text-stone-700">Page Size</label>
          <Select value={pageSize} onChange={e => {
            setPageSize(Number(e.target.value));
            setPage(0);
            setSelected(null);
            setLambdaDetails(null);
          }} className="min-w-[50px] text-xs py-1 px-2">
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </Select>
        </div>
        <button className="ml-2 p-2 rounded hover:bg-stone-200 transition flex items-center" title="Select columns" onClick={() => setShowColumnDialog(true)}>
          {/* Bigger wheel (settings/gear) icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.03-3.5a7.03 7.03 0 0 0-.14-1.53l1.64-1.28a.5.5 0 0 0 .12-.65l-1.56-2.7a.5.5 0 0 0-.61-.22l-1.93.78a7.07 7.07 0 0 0-1.32-.77l-.29-2.05A.5.5 0 0 0 14.5 3h-3a.5.5 0 0 0-.5.42l-.29 2.05a7.07 7.07 0 0 0-1.32.77l-1.93-.78a.5.5 0 0 0-.61.22l-1.56 2.7a.5.5 0 0 0 .12.65l1.64 1.28c-.09.5-.14 1.02-.14 1.53s.05 1.03.14 1.53l-1.64 1.28a.5.5 0 0 0-.12.65l1.56 2.7a.5.5 0 0 0 .61.22l1.93-.78c.41.3.85.56 1.32.77l.29 2.05a.5.5 0 0 0 .5.42h3a.5.5 0 0 0 .5-.42l.29-2.05c.47-.21.91-.47 1.32-.77l1.93.78a.5.5 0 0 0 .61-.22l1.56-2.7a.5.5 0 0 0-.12-.65l-1.64-1.28c.09-.5.14-1.02.14-1.53z" />
          </svg>
          <span className="sr-only">Select Columns</span>
        </button>
      </div>
    </div>
    <div className="relative w-full max-w-7xl overflow-auto flex justify-center px-2 py-4">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-indigo-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-indigo-700 font-semibold text-lg">Loading...</span>
          </div>
        </div>
      )}
       
      <div className="w-full flex flex-col items-center rounded-xl shadow bg-white px-4 py-4">
  <Table className="mx-auto rounded-2xl shadow-lg border border-stone-200 bg-white">
          <thead className="bg-stone-50">
            <TableRow>
              {defaultColumns.map(col => (
                visibleColumns.includes(col.key) && (
                  <TableHead
                    key={col.key}
                    style={{ position: "relative", width: colWidths[col.key] || 120, minWidth: 60, cursor: "pointer", userSelect: "none" }}
                    className="text-indigo-700"
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {sortBy === col.key && (
                        <span className="ml-1 text-xs">{sortOrder === "asc" ? "▲" : "▼"}</span>
                      )}
                    </span>
                    <span
                      style={{ position: "absolute", right: 0, top: 0, height: "100%", width: 8, cursor: "col-resize", zIndex: 10 }}
                      onMouseDown={e => {
                        e.preventDefault();
                        const startX = e.clientX;
                        let lastX = startX;
                        function onMouseMove(ev: MouseEvent) {
                          const delta = ev.clientX - lastX;
                          handleColResize(col.key, delta);
                          lastX = ev.clientX;
                        }
                        function onMouseUp() {
                          window.removeEventListener("mousemove", onMouseMove);
                          window.removeEventListener("mouseup", onMouseUp);
                        }
                        window.addEventListener("mousemove", onMouseMove);
                        window.addEventListener("mouseup", onMouseUp);
                      }}
                    />
                  </TableHead>
                )
              ))}
              <TableHead style={{ position: 'sticky', right: 0, background: '#fafaf9', zIndex: 20 }} className="text-indigo-700">Actions</TableHead>
            </TableRow>
          </thead>
          <tbody>
            {loading
              ? Array(pageSize).fill(0).map((_, idx) => (
                  <TableRow key={idx} className="animate-pulse bg-stone-100">
                    {defaultColumns.map((col, i) => (
                      visibleColumns.includes(col.key) && <TableCell key={i} style={{ width: colWidths[col.key] || 120, minWidth: 60 }}>&nbsp;</TableCell>
                    ))}
                    <TableCell style={{ position: 'sticky', right: 0, background: '#fafaf9', zIndex: 10 }}>&nbsp;</TableCell>
                  </TableRow>
                ))
              : paginatedLambdas.map(fn => (
                  <TableRow key={fn.FunctionName}>
                    {defaultColumns.map(col => (
                      visibleColumns.includes(col.key) ? (
                        <TableCell
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120, minWidth: 60 }}
                          className={col.key === "FunctionName" || col.key === "Description" ? "break-words whitespace-normal font-semibold text-stone-700" : ""}
                        >
                          {col.key === "LastModified"
                            ? formatRelativeTime(fn.LastModified)
                            : col.key === "collectorType"
                              ? fn.collectorType || "-"
                              : Array.isArray(fn[col.key])
                                ? fn[col.key].join(', ')
                                : fn[col.key] || "-"}
                        </TableCell>
                      ) : null
                    ))}
                    <TableCell className="space-x-2" style={{ position: 'sticky', right: 0, background: '#fafaf9', zIndex: 10 }}>
                      <Button size="sm" variant="secondary" className="shadow" onClick={() => fetchLambdaDetails(fn)}>
                        Details
                      </Button>
                      <Button size="sm" variant="secondary" className="shadow" onClick={() => handleViewEnvVars(fn)}>
                        View Env Vars
                      </Button>
                      <Button size="sm" variant="secondary" className="shadow" onClick={() => handleViewLogs(fn)}>
                        View 1Hr logs
                      </Button>
                      <SelfUpdateButton
                        fn={fn}
                        profile={profile}
                        region={region}
                        page={page}
                        pageSize={pageSize}
                        setSuccess={setSuccess}
                        setError={setError}
                        setLambdas={setLambdas}
                      />
                      {fn.Environment?.Variables?.paws_state_queue_url ? (
                        <Button size="sm" variant="secondary" className="shadow" onClick={() => handlePollSqs(fn)}>
                          Poll SQS
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
          </tbody>
        </Table>
        <div className="flex justify-between items-center mt-4 px-2">
          <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-stone-700">Page {page + 1} of {Math.ceil(filteredLambdas.length / pageSize)}</span>
          <Button size="sm" disabled={(page + 1) * pageSize >= filteredLambdas.length} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
        {showColumnDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
              <h3 className="font-semibold text-lg mb-4">Select Columns</h3>
              <div className="flex flex-col gap-2 mb-4">
                {defaultColumns.map(col => (
                  <label key={col.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={e => {
                        let updated;
                        if (e.target.checked) {
                          updated = [...visibleColumns, col.key];
                        } else {
                          updated = visibleColumns.filter(k => k !== col.key);
                        }
                        setVisibleColumns(updated);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem("lambdaVisibleColumns", JSON.stringify(updated));
                        }
                      }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowColumnDialog(false)}>Close</Button>
                <Button size="sm" onClick={() => setVisibleColumns(defaultColumns.map(c => c.key))}>Show All</Button>
              </div>
              <Button size="sm" onClick={() => {
                setVisibleColumns(importantKeys);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("lambdaVisibleColumns", JSON.stringify(importantKeys));
                }
              }}>Show Important</Button>
            </div>
          </div>
        )}
      </div>
    </div>
    {flyoutType === "env" && flyoutLambda && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[700px] max-w-4xl max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-4 right-4 text-stone-500 hover:text-stone-700 transition p-2 rounded-full bg-stone-100 hover:bg-stone-200 shadow"
            aria-label="Close"
            onClick={() => { setFlyoutType(null); setFlyoutLambda(null); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-semibold text-2xl mb-6">Environment Variables for {flyoutLambda.FunctionName}</h3>
          {flyoutLambda.Environment?.Variables && Object.keys(flyoutLambda.Environment.Variables).length > 0 ? (
            <Accordion type="single" collapsible className="w-full" defaultValue="env-vars">
              <AccordionItem value="env-vars">
                <AccordionTrigger className="font-medium text-base py-2">Show Environment Variables</AccordionTrigger>
                <AccordionContent>
                  <table className="w-full text-base border rounded-xl overflow-hidden" style={{ minWidth: "650px" }}>
                    <thead className="bg-stone-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Key</th>
                        <th className="text-left px-3 py-2 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(flyoutLambda.Environment.Variables).map(([key, value], idx) => (
                        <tr key={key} className={idx % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                          <td className="px-3 py-2 font-mono break-all border-b border-stone-100">{key}</td>
                          <td className="px-3 py-2 font-mono break-all border-b border-stone-100">{value as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <span className="text-stone-500">No environment variables found.</span>
          )}
        </div>
      </div>
    )}
    {flyoutType === "logs" && flyoutLambda && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[700px] max-w-4xl max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-4 right-4 text-stone-500 hover:text-stone-700 transition p-2 rounded-full bg-stone-100 hover:bg-stone-200 shadow"
            aria-label="Close"
            onClick={() => { setFlyoutType(null); setFlyoutLambda(null); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-semibold text-2xl mb-6">CloudWatch Logs for {flyoutLambda.FunctionName} (last 1 hour)</h3>
          {logsLoading ? (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-5 w-5 text-indigo-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <span className="text-indigo-700">Loading logs...</span>
            </div>
          ) : Array.isArray(cloudwatchLogs) && cloudwatchLogs.length > 0 ? (
            <table className="w-full text-base border rounded-xl overflow-hidden" style={{ minWidth: "650px" }}>
              <thead className="bg-stone-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Timestamp</th>
                  <th className="text-left px-3 py-2 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody>
                {[...cloudwatchLogs]
                  .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
                  .map((log: any, idx: number) => (
                    <tr key={String(log.timestamp) + '-' + idx + '-' + (log.message?.slice(0,16) ?? '')} className={idx % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                      <td className="px-3 py-2 font-mono break-all border-b border-stone-100">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
                      <td className="px-3 py-2 font-mono break-all border-b border-stone-100">{log.message || ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <span className="text-stone-500">No logs found for the last hour.</span>
          )}
        </div>
      </div>
    )}
    {flyoutType === "sqs" && flyoutLambda && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[700px] max-w-4xl max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-4 right-4 text-stone-500 hover:text-stone-700 transition p-2 rounded-full bg-stone-100 hover:bg-stone-200 shadow"
            aria-label="Close"
            onClick={() => { setFlyoutType(null); setFlyoutLambda(null); handleStopSqsPolling(); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-semibold text-2xl mb-6">SQS Message for {flyoutLambda.FunctionName}</h3>
          <div className="mb-4 flex gap-2">
            {sqsLoading && (
              <Button size="sm" variant="destructive" onClick={handleStopSqsPolling}>
                Stop Polling
              </Button>
            )}
          </div>
          {sqsLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-2">
                <svg className="animate-spin h-5 w-5 text-indigo-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <span className="text-indigo-700">Polling SQS messages...</span>
              </div>
              
              {/* Progress Information */}
              {sqsProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-blue-800">Time Elapsed:</span>
                      <div className="text-blue-600">
                        {Math.round(sqsProgress.timeElapsed / 1000)}s / 300s max
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Strategy:</span>
                      <div className="text-blue-600 capitalize">
                        {sqsProgress.strategy.replace('-', ' ')}
                        {sqsProgress.pollCount > 0 && ` (${sqsProgress.pollCount} polls)`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-blue-100 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((sqsProgress.timeElapsed / 300000) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Strategy explanation */}
                  <div className="mt-2 text-xs text-blue-600">
                    {sqsProgress.strategy === 'initializing' && 'Checking queue status...'}
                    {sqsProgress.strategy === 'no-messages' && 'Queue appears empty, skipping polling'}
                    {sqsProgress.strategy === 'quick-poll' && 'Found messages immediately'}
                    {sqsProgress.strategy === 'long-poll' && 'Using optimized long polling'}
                    {sqsProgress.strategy === 'completed' && 'Polling completed'}
                  </div>
                </div>
              )}
              
              <div className="text-center text-xs text-gray-500">
                Optimized polling with intelligent queue detection.<br/>
                Maximum wait time: 5 minutes (matches backend polling duration)
              </div>
            </div>
          ) : sqsMessage ? (
            sqsMessage.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-semibold mb-2">❌ Polling Error</div>
                <div className="text-red-700 text-sm mb-2">{sqsMessage.error}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-red-700">
                  {sqsMessage.awsError && (
                    <div><span className="font-semibold">AWS Error:</span> {sqsMessage.awsError}</div>
                  )}
                  {sqsMessage.awsMessage && (
                    <div><span className="font-semibold">AWS Message:</span> {sqsMessage.awsMessage}</div>
                  )}
                  {sqsMessage.profile && (
                    <div><span className="font-semibold">Profile:</span> {sqsMessage.profile}</div>
                  )}
                  {sqsMessage.region && (
                    <div><span className="font-semibold">Region:</span> {sqsMessage.region}</div>
                  )}
                  {sqsMessage.queueUrl && (
                    <div><span className="font-semibold">Queue URL:</span> {sqsMessage.queueUrl}</div>
                  )}
                  {sqsMessage.time && (
                    <div><span className="font-semibold">Time:</span> {sqsMessage.time}</div>
                  )}
                  {sqsMessage.stack && (
                    <div className="col-span-2"><span className="font-semibold">Stack Trace:</span><pre className="bg-red-100 rounded p-2 overflow-x-auto text-xs mt-1">{sqsMessage.stack}</pre></div>
                  )}
                </div>
                {sqsProgress && (
                  <div className="mt-3 text-xs text-red-500">
                    Time elapsed: {Math.round(sqsProgress.timeElapsed / 1000)}s | 
                    Strategy: {sqsProgress.strategy} | 
                    Polls: {sqsProgress.pollCount}
                  </div>
                )}
                <div className="mt-3 text-xs text-red-700">
                  <strong>Troubleshooting:</strong> Check AWS credentials, profile, region, and queue URL. See error details above for more information.
                </div>
              </div>
            ) : Array.isArray(sqsMessage.messages) && sqsMessage.messages.length > 0 ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-green-800 font-semibold mb-2">
                    ✅ Found {sqsMessage.messages.length} SQS message{sqsMessage.messages.length !== 1 ? 's' : ''}
                  </div>
                  {sqsProgress && (
                    <div className="text-xs text-green-600">
                      Retrieved in {Math.round(sqsProgress.timeElapsed / 1000)}s using {sqsProgress.strategy.replace('-', ' ')} strategy
                      {sqsProgress.pollCount > 0 && ` (${sqsProgress.pollCount} polls)`}
                    </div>
                  )}
                  {sqsMessage.queueStatus && (
                    <div className="text-xs text-green-600 mt-1">
                      Queue status: {sqsMessage.queueStatus.visibleMessages} visible, {sqsMessage.queueStatus.inFlightMessages} in-flight messages
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border rounded-xl overflow-hidden max-w-3xl">
                    <thead className="bg-stone-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">MessageId</th>
                        <th className="text-left px-3 py-2 font-semibold">Body</th>
                        <th className="text-left px-3 py-2 font-semibold">Attributes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sqsMessage.messages.map((msg: any, idx: number) => (
                        <tr key={msg.MessageId || idx} className={idx % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                          <td className="px-3 py-2 font-mono break-all border-b border-stone-100">{msg.MessageId || '-'}</td>
                          <td className="px-3 py-2 font-mono break-all border-b border-stone-100" style={{maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{msg.Body || '-'}</td>
                          <td className="px-3 py-2 font-mono break-all border-b border-stone-100" style={{maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{msg.Attributes ? JSON.stringify(msg.Attributes, null, 2) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-800 font-semibold mb-2">📭 No Messages Found</div>
                <div className="text-yellow-700 text-sm mb-2">
                  No SQS messages found after polling
                  {sqsProgress && ` (${Math.round(sqsProgress.timeElapsed / 1000)}s using ${sqsProgress.strategy.replace('-', ' ')} strategy)`}
                </div>
                {sqsMessage.queueStatus && (
                  <div className="text-xs text-yellow-600 mt-2">
                    Queue status: {sqsMessage.queueStatus.visibleMessages} visible messages, {sqsMessage.queueStatus.inFlightMessages} in-flight
                  </div>
                )}
                {sqsProgress && (
                  <div className="mt-2 text-xs text-yellow-700">
                    Polls: {sqsProgress.pollCount} | Strategy: {sqsProgress.strategy}
                  </div>
                )}
                <div className="mt-2 text-xs text-yellow-700">
                  <strong>Diagnostics:</strong>
                  {sqsMessage.profile && <div>Profile: {sqsMessage.profile}</div>}
                  {sqsMessage.region && <div>Region: {sqsMessage.region}</div>}
                  {sqsMessage.queueUrl && <div>Queue URL: {sqsMessage.queueUrl}</div>}
                  {sqsMessage.time && <div>Time: {sqsMessage.time}</div>}
                  {sqsMessage.lastError && <div>Last Error: {sqsMessage.lastError}</div>}
                </div>
              </div>
            )
          ) : (
            <span className="text-stone-500">No SQS message found.</span>
          )}
        </div>
      </div>
    )}
    {lambdaDetails && (
  <div className="w-full max-w-4xl mt-8 mx-auto">
        <h2 className="font-semibold text-lg mb-2">{selected?.FunctionName} Details</h2>
        <pre className="bg-stone-100 rounded p-2 mb-4 text-xs overflow-x-auto">{JSON.stringify(lambdaDetails.config, null, 2)}</pre>
        <h3 className="font-semibold mb-2">Mapped SQS Queues</h3>
        <div>
          {lambdaDetails.queues.length === 0 ? (
            <div>No SQS queues mapped to this Lambda.</div>
          ) : (
            <Table>
              <thead>
                <TableRow>
                  <TableHead>Queue URL</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </thead>
              <tbody>
                {lambdaDetails.queues.map((q: any) => (
                  <TableRow key={q.url}>
                    <TableCell>{q.url}</TableCell>
                    <TableCell>
                      <span>{q.state}</span>
                    </TableCell>
                    <TableCell>
                      {q.enabled ? (
                        <Button variant="destructive" size="sm" onClick={() => toggleQueue(q.uuid, false)}>
                          Disable
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => toggleQueue(q.uuid, true)}>
                          Enable
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          {Object.entries(envVars).map(([key, value]) => {
            const isEditing = editingEnvVars[key] || false;
            const editValue = isEditing ? (editValues[key] ?? (value as string)) : (value as string);
            return (
              <div key={key} className="flex items-center gap-2 mb-2">
                <Input value={key} readOnly className="w-1/3" />
                <Input
                  value={editValue}
                  readOnly={!isEditing}
                  onChange={e => {
                    setEditValues(prev => ({ ...prev, [key]: e.target.value }));
                  }}
                  className="w-1/2"
                />
                {!isEditing ? (
                  <Button size="sm" onClick={() => setEditingEnvVars(prev => ({ ...prev, [key]: true }))}>Update</Button>
                ) : (
                  <Button size="sm" variant="primary" onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${selected?.FunctionName}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ envVars: { ...envVars, [key]: editValues[key] ?? value } })
                      });
                      if (!res.ok) throw new Error("Failed to update environment variable");
                      const data = await res.json();
                      setEnvVars(data?.config?.Environment?.Variables || {});
                      setLambdaDetails(data);
                      setEditingEnvVars(prev => ({ ...prev, [key]: false }));
                    } catch (err: any) {
                      setError(err?.message || "Failed to update environment variable.");
                    }
                    setLoading(false);
                  }}>Save</Button>
                )}
              </div>
            );
          })}
          <div className="flex gap-2 mt-2">
            <Button onClick={addEnvVar}>Add Variable</Button>
            <Button
              onClick={async () => {
                setLoading(true);
                setError("");
                setSuccess("");
                try {
                  const updatedEnvVars = { ...envVars };
                  Object.entries(editValues).forEach(([key, value]) => {
                    updatedEnvVars[key] = value;
                  });
                  const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${selected?.FunctionName}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ envVars: updatedEnvVars })
                  });
                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData?.error || "Failed to save environment variables.");
                  }
                  const data = await res.json();
                  setEnvVars(data?.config?.Environment?.Variables || {});
                  setLambdaDetails(data);
                  setSuccess("Environment variables saved successfully.");
                  setEditingEnvVars({});
                  setEditValues({});
                } catch (err: any) {
                  setError(err?.message || "Failed to save environment variables.");
                }
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
