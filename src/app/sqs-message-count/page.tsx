"use client";

import React, { useState, useEffect } from "react";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface CollectorSqsData {
  functionName: string;
  collectorType: string;
  customerId: string;
  sqsMessageCount?: number;
  pawsStateQueueUrl?: string;
  eventSourceMappings?: Array<{
    UUID: string;
    State: string;
    Enabled: boolean;
    EventSourceArn: string;
  }>;
}

const PROFILE_OPTIONS = ["playground", "paws_integration", "paws"];
const REGION_OPTIONS = ["us-east-1"];

export default function SqsMessageCountPage() {
  const [data, setData] = useState<CollectorSqsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<{ [key: string]: boolean }>({});
  const [countLoading, setCountLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [profile, setProfile] = useState(PROFILE_OPTIONS[0]);
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedCollectorType, setSelectedCollectorType] = useState<string>("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/collector-summary?profile=${profile}&region=${region}`)
      .then(res => res.json())
      .then(async json => {
        setSummary({
          collectorCounts: json.collectorCounts,
          totalCollectors: json.totalCollectors,
          totalCustomers: json.totalCustomers,
          customersWithCollectors: json.customersWithCollectors
        });
        const collectors: CollectorSqsData[] = json.collectorDetails || [];
        // Only fetch event source mappings, NOT SQS count
        const withMappings = await Promise.all(
          collectors.map(async (collector) => {
            try {
              const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${collector.functionName}&eventSourceMappings=1`);
              const data = await res.json();
              return { ...collector, eventSourceMappings: data.eventSourceMappings || [], sqsMessageCount: undefined };
            } catch {
              return { ...collector, eventSourceMappings: [], sqsMessageCount: undefined };
            }
          })
        );
        setData(withMappings);
        setError(null);
      })
      .catch(err => {
        setError(err?.message || "Failed to fetch SQS message counts.");
        setData([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [profile, region]);

  return (
    <>
      {summary && (
        <div className="w-full max-w-4xl mt-8 mb-4 px-6 py-4 rounded-2xl shadow bg-white flex flex-col items-center">
          <div className="w-full flex flex-col items-center gap-1">
            <h1 className="text-base font-bold text-indigo-700 tracking-tight mb-0 leading-tight">AlertLogic AWS Lambda Collector Summary</h1>
            <p className="text-xs text-stone-500 text-center mb-1">Overview of collectors, customers, and types for the selected profile and region.</p>
            <div className="flex flex-col items-center gap-1 mt-1 mb-1">
              <div className="flex flex-wrap gap-2 justify-center mb-1 min-h-[24px]">
                {Object.keys(summary.collectorCounts || {}).length > 0 ? (
                  Object.entries(summary.collectorCounts)
                    .sort(([a], [b]) => {
                      if (a === '-' && b !== '-') return 1;
                      if (a !== '-' && b === '-') return -1;
                      return a.localeCompare(b);
                    })
                    .filter(([type]) => type !== '-')
                    .map(([type, count]) => (
                      <button
                        key={type}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border shadow-sm transition-all duration-150 focus:outline-none ${selectedCollectorType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}
                        style={{ minWidth: 70, justifyContent: 'center' }}
                        onClick={() => {
                          setFilter(type);
                          setSelectedCollectorType(type);
                        }}
                        aria-label={`Filter by ${type}`}
                      >
                        {type}: {count as any}
                      </button>
                    ))
                ) : (
                  <span className="text-xs text-stone-400">No collector data</span>
                )}
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
              </div>
              <div className="flex flex-wrap gap-2 justify-center items-center">
                <span className="font-medium text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1 border border-indigo-100 shadow-sm min-h-[24px] flex items-center justify-center">
                  <>Total Collectors <span className="font-bold">({summary.totalCollectors})</span></>
                </span>
                {summary.totalCustomers > 0 && (
                  <span className="font-medium text-xs text-green-700 bg-green-50 rounded px-2 py-1 border border-green-100 shadow-sm min-h-[24px] flex items-center justify-center">
                    <>Customers with Collectors <span className="font-bold">({summary.customersWithCollectors}/{summary.totalCustomers})</span></>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
  <div className="flex gap-2 mb-4 w-full justify-between items-end">
        <div className="flex flex-col gap-1 min-w-[90px]">
          <label className="text-xs font-semibold mb-0 text-stone-700">AWS Profile</label>
          <Select
            value={profile}
            onChange={e => setProfile(e.target.value)}
            className="min-w-[70px] text-xs py-1 px-2"
            disabled={loading}
          >
            {PROFILE_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[90px]">
          <label className="text-xs font-semibold mb-0 text-stone-700">Region</label>
          <Select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="min-w-[70px] text-xs py-1 px-2"
            disabled={loading}
          >
            {REGION_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col flex-1 min-w-[90px] gap-1">
          <label className="text-xs font-semibold mb-0 text-stone-700">Filter</label>
          <Input
            placeholder="Filter by function name, customer id, or SQS count"
            value={filter}
            onChange={e => {
              setLoading(true);
              setFilter(e.target.value);
            }}
            className="w-full rounded-lg border border-stone-300 shadow-sm focus:ring-2 focus:ring-indigo-400 text-xs py-1 px-2 pr-7"
            disabled={loading}
          />
        </div>
  <Button className="mt-6" onClick={() => window.location.reload()} disabled={loading}>Refresh</Button>
      </div>
      {loading && <div className="text-stone-500">Loading...</div>}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
  {!loading && !error && (
        <Table className="mx-auto rounded-2xl shadow-lg border border-stone-200 bg-white mt-4 min-w-[1200px]">
          <thead className="bg-stone-50">
            <TableRow>
              <TableHead>Function Name</TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Collector Type</TableHead>
              <TableHead>SQS Message Count</TableHead>
              <TableHead>SQS Queue URL</TableHead>
              <TableHead>SQS Enabled</TableHead>
            </TableRow>
          </thead>
          <tbody>
            {data.filter(collector => !selectedCollectorType || collector.collectorType === selectedCollectorType).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-stone-400">No collectors found.</TableCell>
              </TableRow>
            ) : (
                data.filter(collector => !selectedCollectorType || collector.collectorType === selectedCollectorType).map((collector: CollectorSqsData, idx: number) => (
                  <TableRow key={collector.functionName + idx}>
                    <TableCell>{collector.functionName}</TableCell>
                    <TableCell>{collector.customerId}</TableCell>
                    <TableCell>{collector.collectorType || '-'}</TableCell>
                    <TableCell>
                      {countLoading[collector.functionName] ? (
                        <span className="animate-spin mr-1">⏳</span>
                      ) : typeof collector.sqsMessageCount === "number" ? (
                        collector.sqsMessageCount
                      ) : (
                        collector.sqsMessageCount === 0 ? 0 : "-"
                      )}
                      {(() => {
                        // Always use the latest backend pawsStateQueueUrl for Get Count
                        const backendQueueUrl = data[idx]?.pawsStateQueueUrl;
                        if (backendQueueUrl) {
                          return (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="ml-2"
                              disabled={countLoading[collector.functionName]}
                              title="Get the current SQS message count for this queue"
                              onClick={async () => {
                                setCountLoading(prev => ({ ...prev, [collector.functionName]: true }));
                                try {
                                  const res = await fetch("/api/sqs-get-count", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      profile,
                                      region,
                                      queueUrl: backendQueueUrl
                                    })
                                  });
                                  const json = await res.json();
                                  if (typeof json.sqsMessageCount === 'number') {
                                    setData(prev => prev.map((c, i) => i === idx ? { ...c, sqsMessageCount: json.sqsMessageCount } : c));
                                  } else {
                                    setError(json.error || "Failed to get SQS message count.");
                                    setData(prev => prev.map((c, i) => i === idx ? { ...c, sqsMessageCount: 0 } : c));
                                  }
                                } catch (err: any) {
                                  setError(err?.message || "Failed to get SQS message count.");
                                } finally {
                                  setCountLoading(prev => ({ ...prev, [collector.functionName]: false }));
                                }
                              }}
                            >Get Count</Button>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>
                    <TableCell className="break-words whitespace-pre-line text-xs max-w-[200px]">{collector.pawsStateQueueUrl || "-"}</TableCell>
                    <TableCell>
                      {collector.eventSourceMappings && collector.eventSourceMappings.length > 0 ? (
                        collector.eventSourceMappings.map(mapping => (
                          <div key={mapping.UUID} className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={mapping.Enabled}
                                disabled={rowLoading[mapping.UUID]}
                                onChange={async (e) => {
                                  setRowLoading(prev => ({ ...prev, [mapping.UUID]: true }));
                                  const desiredState = e.target.checked;
                                  const desiredAwsState = desiredState ? "Enabled" : "Disabled";
                                  try {
                                    const resp = await fetch("/api/sqs-toggle", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        profile,
                                        region,
                                        functionName: collector.functionName,
                                        uuid: mapping.UUID,
                                        enable: desiredState
                                      })
                                    });
                                    if (!resp.ok) {
                                      const errJson = await resp.json();
                                      if (errJson?.error && errJson.error.includes('ResourceInUseException')) {
                                        setError('AWS error: Resource is busy. Please wait a few seconds and try again.');
                                        return;
                                      } else {
                                        setError(errJson?.error || 'Failed to toggle SQS mapping.');
                                        return;
                                      }
                                    }
                                    // Poll the backend until the mapping State is exactly 'Enabled' or 'Disabled' and matches the desired state
                                    let attempts = 0;
                                    let mappingsData = null;
                                    const maxAttempts = 15;
                                    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
                                    while (attempts < maxAttempts) {
                                      const mappingsRes = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${collector.functionName}&eventSourceMappings=1`);
                                      mappingsData = await mappingsRes.json();
                                      const found = (mappingsData.eventSourceMappings || []).find((m: any) => m.UUID === mapping.UUID);
                                      if (found && found.State === desiredAwsState) {
                                        break;
                                      }
                                      attempts++;
                                      await delay(900);
                                    }
                                    // Always fetch the latest eventSourceMappings and config after polling
                                    let latestMappings = mappingsData.eventSourceMappings || [];
                                    let latestConfig = mappingsData.config || {};
                                    setData(prev => prev.map((c, i) => {
                                      if (i !== idx) return c;
                                      return {
                                        ...c,
                                        eventSourceMappings: latestMappings,
                                        pawsStateQueueUrl: c.pawsStateQueueUrl || (latestConfig?.Environment?.Variables?.paws_state_queue_url ?? undefined)
                                      };
                                    }));
                                    // If disabling, poll for SQS count for a few seconds and update UI
                                    if (!desiredState && collector.pawsStateQueueUrl) {
                                      let countAttempts = 0;
                                      const maxCountAttempts = 8;
                                      let lastCount: number | null = null;
                                      while (countAttempts < maxCountAttempts) {
                                        const countRes = await fetch("/api/sqs-get-count", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            profile,
                                            region,
                                            queueUrl: collector.pawsStateQueueUrl
                                          })
                                        });
                                        const countJson = await countRes.json();
                                        if (typeof countJson.sqsMessageCount === 'number' && countJson.sqsMessageCount !== lastCount) {
                                          lastCount = countJson.sqsMessageCount;
                                          setData(prev => prev.map((c, i) => i === idx ? { ...c, sqsMessageCount: lastCount ?? 0 } : c));
                                        }
                                        countAttempts++;
                                        await delay(1200);
                                      }
                                    }
                                  } catch (err: any) {
                                    setError(err?.message || "Failed to toggle SQS mapping.");
                                  } finally {
                                    setRowLoading(prev => ({ ...prev, [mapping.UUID]: false }));
                                  }
                                }}
                              />
                              <span
                                className={
                                  mapping.State === 'Updating' ? 'text-stone-500' :
                                  mapping.Enabled ? 'text-green-700' : 'text-red-600'
                                }
                              >
                                {rowLoading[mapping.UUID] || mapping.State === 'Updating'
                                  ? 'Updating...'
                                  : mapping.Enabled
                                    ? 'Enabled'
                                    : 'Disabled'}
                              </span>
                            </div>
                            {/* Buttons removed, only checkbox controls status now */}
                          </div>
                        ))
                      ) : (
                        <span className="text-stone-400">No SQS Mapping</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        )}
      </>
  );
}
