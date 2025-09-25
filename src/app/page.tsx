"use client";
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
    async function fetchCollectorSummary() {
      setCollectorSummaryLoading(true);
      try {
        const res = await fetch(`/api/collector-summary?profile=${profile}&region=${region}`);
        if (!res.ok) throw new Error("Failed to fetch collector summary");
        const data = await res.json();
        setCollectorSummary(data.collectorCounts || {});
      } catch {
        setCollectorSummary({});
      } finally {
        setCollectorSummaryLoading(false);
      }
    }
    fetchCollectorSummary();
  }, [profile, region]);
  // Flyout state for viewing env vars and logs
  const [flyoutType, setFlyoutType] = useState<"env"|"logs"|"sqs"|null>(null);
  const [flyoutLambda, setFlyoutLambda] = useState<any>(null);
  const [cloudwatchLogs, setCloudwatchLogs] = useState<any[]>([]);
  // SQS Poll flyout state
  const [sqsMessage, setSqsMessage] = useState<any>(null);
  const [sqsLoading, setSqsLoading] = useState(false);
  const sqsAbortControllerRef = useRef<AbortController | null>(null);

  // Handler to open SQS poll flyout
  async function handlePollSqs(lambda: any) {
    setSqsMessage(null);
    setSqsLoading(true);
    setFlyoutType("sqs");
    setFlyoutLambda(lambda);
    const queueUrl = lambda?.Environment?.Variables?.paws_state_queue_url;
    if (!queueUrl) {
      setSqsMessage({ error: "No paws_state_queue_url found in environment variables." });
      setSqsLoading(false);
      return;
    }
    // AbortController for stop polling
    const abortController = new AbortController();
    sqsAbortControllerRef.current = abortController;
    try {
      const res = await fetch("/api/sqs-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          region: lambda.Region || region,
          queueUrl
        }),
        signal: abortController.signal
      });
      const data = await res.json();
      setSqsMessage(data);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setSqsMessage({ error: "Polling stopped by user." });
      } else {
        setSqsMessage({ error: err?.message || "Failed to poll SQS." });
      }
    }
    setSqsLoading(false);
    sqsAbortControllerRef.current = null;
  }

  function handleStopSqsPolling() {
    if (sqsAbortControllerRef.current) {
      sqsAbortControllerRef.current.abort();
    }
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
  const [error, setError] = useState<string>("");
  const [selected, setSelected] = useState<any>(null);
  const [lambdaDetails, setLambdaDetails] = useState<any>(null);
  const [regions, setRegions] = useState<string[]>(["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [filter, setFilter] = useState("");
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
    setError("");
    async function fetchLambdas() {
      try {
        const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}`);
        if (!res.ok) throw new Error("Failed to fetch Lambdas");
        const data = await res.json();
        setLambdas(Array.isArray(data.lambdas) ? data.lambdas : []);
        setTotalLambdaCount(Array.isArray(data.lambdas) ? data.lambdas.length : 0);
      } catch (err: any) {
        setLambdas([]);
        setTotalLambdaCount(0);
        setError(err?.message || "Failed to load Lambdas.");
      }
      setLoading(false);
    }
    fetchLambdas();
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
      const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${fn.FunctionName}`);
      if (!res.ok) throw new Error("Failed to fetch Lambda details");
      const data = await res.json();
      setLambdaDetails(data);
      setEnvVars(data?.config?.Environment?.Variables || {});
    } catch (err: any) {
      setLambdaDetails(null);
      setError(err?.message || "Failed to load Lambda details.");
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
              <>
                {Object.keys(collectorSummary).length > 0 &&
                  Object.entries(collectorSummary)
                    .sort(([a], [b]) => {
                      if (a === '-' && b !== '-') return 1;
                      if (a !== '-' && b === '-') return -1;
                      return a.localeCompare(b);
                    })
                    .map(([type, count]) => (
                      <span key={type} className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-200 shadow-sm">
                        {type === '-' ? 'Unknown' : type}: {count}
                      </span>
                    ))}
                {Object.keys(collectorSummary).length === 0 && (
                  <span className="text-xs text-stone-400">No collector data</span>
                )}
              </>
            )}
          </div>
          <span className="font-medium text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1 border border-indigo-100 shadow-sm min-h-[24px] flex items-center justify-center">
            <>Total Lambda Collectors <span className="font-bold">({totalLambdaCount})</span></>
          </span>
        </div>
      </div>
    </div>
    {error && (
      <div className="w-full max-w-2xl flex justify-center mb-2">
        <Alert variant="error" className="w-full">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
                      <Button size="sm" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow" onClick={async () => {
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
                          setLoading(false);
                        } catch (err: any) {
                          setError(err?.message || "Failed to trigger SelfUpdate.");
                          setLoading(false);
                        }
                      }}>
                        SelfUpdate
                      </Button>
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
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-5 w-5 text-indigo-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <span className="text-indigo-700">Polling SQS (up to 5 minutes)...</span>
            </div>
          ) : sqsMessage ? (
            sqsMessage.error ? (
              <div className="text-red-600 font-semibold">{sqsMessage.error}</div>
            ) : Array.isArray(sqsMessage.messages) && sqsMessage.messages.length > 0 ? (
              <>
                <div className="mb-2 text-xs text-stone-600">SQS messages received ({sqsMessage.messages.length}):</div>
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
              <span className="text-stone-500">No SQS messages found after 5 minutes of polling.</span>
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
