"use client";

import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ErrorCollector {
  functionName: string;
  collectorId: string;
  collectorType: string;
  customerId: string;
  errorDescription: string;
  errorTimestamp: number;
  lastErrorTime: string;
  errorCount: number;
  latestError: string;
  pawsStateQueueUrl?: string;
  sqsMessageCount?: number;
  eventSourceMappings?: Array<{
    UUID: string;
    State: string;
    Enabled: boolean;
    EventSourceArn: string;
  }>;
}
export default function ErrorCollectorsPage() {
    // State management
   
  const [errorCollectors, setErrorCollectors] = useState<ErrorCollector[]>([]);
  const [filteredCollectors, setFilteredCollectors] = useState<ErrorCollector[]>([]);
  const [rowLoading, setRowLoading] = useState<{ [key: string]: boolean }>({});
  const [countLoading, setCountLoading] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [availableCollectorTypes, setAvailableCollectorTypes] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    processingTimeMs?: number;
    totalCollectors?: number;
    hasMore?: boolean;
  }>({});
  
  // AWS configuration
  const [profile, setProfile] = useState("playground");
  const [profiles] = useState<string[]>(["playground", "paws_integration", "paws"]);
  const [region, setRegion] = useState("us-east-1");
  const [regions] = useState<string[]>([
    "us-east-1", "us-east-2", "us-west-1", "us-west-2", 
    "eu-west-1", "eu-west-2", "eu-central-1", "ap-southeast-1", "ap-southeast-2"
  ]);
  
  // Filtering and pagination
  const [filter, setFilter] = useState("");
  const [collectorTypeFilter, setCollectorTypeFilter] = useState("");
  const [filterPattern, setFilterPattern] = useState('"Error" OR "error" OR "ERROR"');
  const [timeRange, setTimeRange] = useState("2h"); // Default to 2 hours
  const [timeRangeOptions] = useState([
    { value: "15m", label: "Past 15 Minutes" },
    { value: "1h", label: "Past 1 Hour" },
    { value: "2h", label: "Past 2 Hours" },
    { value: "1d", label: "Past 1 Day" }
  ]);
  const [sortBy, setSortBy] = useState<"errorCount" | "functionName" | "collectorType" | "customerId" | "lastErrorTime">("errorCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);

  // Helper function to get current time range label
  const getCurrentTimeRangeLabel = () => {
    const option = timeRangeOptions.find(opt => opt.value === timeRange);
    return option ? option.label : "Past 2 Hours";
  };

  // Manual search function
  const searchErrorCollectors = async () => {
    setLoading(true);
    setError(null);
    const debugLog = (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(`[ERROR-COLLECTORS] ${new Date().toISOString()}: ${message}`, data || '');
      }
    };
    debugLog('Starting to fetch error collectors', { profile, region, collectorTypeFilter });
    try {
      const params = new URLSearchParams({
        profile,
        region,
        limit: '200',
        parallel: '15',
        timeout: '180000',
        timeRange: timeRange
      });
      if (collectorTypeFilter) {
        params.append('collectorType', collectorTypeFilter);
        debugLog('Added collector type filter', collectorTypeFilter);
      }
      if (filterPattern.trim()) {
        params.append('filterPattern', filterPattern.trim());
        debugLog('Added filter pattern', filterPattern);
      }
      debugLog('Making API request with params', Object.fromEntries(params));
      const res = await fetch(`/api/error-collectors?${params}`);
      debugLog('API response received', { ok: res.ok, status: res.status, statusText: res.statusText });
      if (!res.ok) {
        throw new Error(`Failed to fetch error collectors: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      debugLog('API data received', {
        errorCollectorsCount: data.errorCollectors?.length || 0,
        availableTypesCount: data.availableCollectorTypes?.length || 0,
        processingTimeMs: data.processingTimeMs,
        totalCollectors: data.totalCollectors
      });
      // For each error collector, fetch SQS details and event source mappings
      const collectorsWithSqs = await Promise.all(
        (data.errorCollectors || []).map(async (collector: ErrorCollector) => {
          try {
            const lambdaRes = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${collector.functionName}&eventSourceMappings=1`);
            const lambdaData = await lambdaRes.json();
            const pawsStateQueueUrl = lambdaData.config?.Environment?.Variables?.paws_state_queue_url;
            let sqsMessageCount: number | undefined = undefined;
            if (pawsStateQueueUrl) {
              // Only fetch SQS count after Search, not on page load
              try {
                const sqsRes = await fetch("/api/sqs-get-count", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ profile, region, queueUrl: pawsStateQueueUrl })
                });
                const sqsData = await sqsRes.json();
                sqsMessageCount = sqsData.sqsMessageCount;
              } catch {}
            }
            return {
              ...collector,
              pawsStateQueueUrl,
              sqsMessageCount,
              eventSourceMappings: lambdaData.eventSourceMappings || []
            };
          } catch {
            return { ...collector };
          }
        })
      );
      setErrorCollectors(collectorsWithSqs);
      setAvailableCollectorTypes(data.availableCollectorTypes || []);
      setPerformanceMetrics({
        processingTimeMs: data.processingTimeMs,
        totalCollectors: data.totalCollectors,
        hasMore: data.hasMore
      });
      debugLog('State updated successfully');
    } catch (err: any) {
      console.error('Error fetching error collectors:', err);
      debugLog('Error occurred', err);
      setError(err.message || "Failed to fetch error collectors");
      setErrorCollectors([]);
      setPerformanceMetrics({});
    } finally {
      setLoading(false);
      debugLog('Finished fetching error collectors');
    }
  };

  // Filter and sort collectors
  useEffect(() => {
    let filtered = [...errorCollectors];
    
    // Apply text filter
    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(collector => 
        collector.functionName?.toLowerCase().includes(lowerFilter) ||
        collector.collectorType?.toLowerCase().includes(lowerFilter) ||
        collector.collectorId?.toLowerCase().includes(lowerFilter) ||
        collector.latestError?.toLowerCase().includes(lowerFilter)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case "errorCount":
          aVal = a.errorCount || 0;
          bVal = b.errorCount || 0;
          break;
        case "functionName":
          aVal = a.functionName || "";
          bVal = b.functionName || "";
          break;
        case "collectorType":
          aVal = a.collectorType || "";
          bVal = b.collectorType || "";
          break;
        case "customerId":
          aVal = a.customerId || "";
          bVal = b.customerId || "";
          break;
        case "lastErrorTime":
          aVal = a.errorTimestamp || 0;
          bVal = b.errorTimestamp || 0;
          break;
        default:
          aVal = a.errorCount || 0;
          bVal = b.errorCount || 0;
      }
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    
    setFilteredCollectors(filtered);
    setCurrentPage(0); // Reset to first page when filtering
  }, [errorCollectors, filter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredCollectors.length / pageSize);
  const paginatedCollectors = filteredCollectors.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Export to JSON functionality
  const exportToJSON = () => {
    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          profile,
          region,
          timeRange: getCurrentTimeRangeLabel(),
          totalCollectors: filteredCollectors.length,
          filters: {
            textFilter: filter,
            collectorTypeFilter: collectorTypeFilter || "All Types",
            filterPattern: filterPattern || "Default Error Pattern"
          },
          sorting: {
            sortBy,
            sortOrder
          },
          performanceMetrics
        },
        errorCollectors: filteredCollectors.map(collector => ({
          functionName: collector.functionName,
          collectorId: collector.collectorId,
          collectorType: collector.collectorType,
          customerId: collector.customerId,
          errorCount: collector.errorCount,
          lastErrorTime: collector.lastErrorTime,
          errorTimestamp: collector.errorTimestamp,
          formattedErrorTime: formatTimestamp(collector.errorTimestamp),
          errorDescription: collector.errorDescription,
          latestError: collector.latestError
        }))
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const fileName = `error-collectors-${profile}-${region}-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message
      setExportSuccess(`Successfully exported ${filteredCollectors.length} error collectors to ${fileName}`);
      setTimeout(() => setExportSuccess(null), 5000); // Clear message after 5 seconds
    } catch (err) {
      setError("Failed to export data to JSON");
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200">
      {/* Header */}
      <div className="w-full max-w-6xl mt-8 mb-6 px-6 py-4 rounded-2xl shadow bg-white">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold text-red-700 tracking-tight">
            Collectors with Errors ({getCurrentTimeRangeLabel()})
          </h1>
          <p className="text-sm text-stone-600 text-center">
            Monitor and analyze collector functions that have experienced errors in the {getCurrentTimeRangeLabel().toLowerCase()}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-6xl mb-6 px-6 py-4 rounded-2xl shadow bg-white">
        <div className="flex flex-wrap gap-4 items-end justify-center">
          {/* AWS Profile */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-semibold text-stone-700">AWS Profile</label>
            <Select 
              value={profile} 
              onChange={e => setProfile(e.target.value)}
              className="text-xs py-2 px-3"
            >
              {profiles.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>

          {/* Region */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-semibold text-stone-700">Region</label>
            <Select 
              value={region} 
              onChange={e => setRegion(e.target.value)}
              className="text-xs py-2 px-3"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>

          {/* Time Range */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-semibold text-stone-700">Time Range</label>
            <Select 
              value={timeRange} 
              onChange={e => setTimeRange(e.target.value)}
              className="text-xs py-2 px-3"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Filter Pattern */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-stone-700">CloudWatch Filter Pattern</label>
            <textarea
              placeholder='e.g., "Error" OR "error" OR "Invalid API key" OR "ConnectionError"'
              value={filterPattern}
              onChange={e => setFilterPattern(e.target.value)}
              className="w-full text-xs py-2 px-3 border border-gray-300 rounded resize-none"
              rows={2}
              title="CloudWatch Logs filter pattern - use quotes for exact matches, OR/AND for logic"
            />
          </div>

          {/* Filter */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-stone-700">Filter</label>
            <div className="relative">
              <Input
                placeholder="Filter by function name, collector type, or error message"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full text-xs py-2 px-3 pr-8"
              />
              {filter && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm"
                  onClick={() => setFilter("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Collector Type Filter */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-semibold text-stone-700">Collector Type</label>
            <Select 
              value={collectorTypeFilter} 
              onChange={e => setCollectorTypeFilter(e.target.value)}
              className="text-xs py-2 px-3"
            >
              <option value="">All Types</option>
              {availableCollectorTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-semibold text-stone-700">Sort By</label>
            <Select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs py-2 px-3"
            >
              <option value="errorCount">Error Count</option>
              <option value="functionName">Function Name</option>
              <option value="collectorType">Collector Type</option>
              <option value="customerId">Customer ID</option>
              <option value="lastErrorTime">Last Error Time</option>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-xs font-semibold text-stone-700">Order</label>
            <Select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value as "asc" | "desc")}
              className="text-xs py-2 px-3"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </div>

          {/* Export Button */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-xs font-semibold text-stone-700">Export</label>
            <button
              onClick={exportToJSON}
              disabled={filteredCollectors.length === 0}
              className="text-xs py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded border transition-colors"
              title={filteredCollectors.length === 0 ? "No data to export" : `Export ${filteredCollectors.length} error collectors to JSON`}
            >
              📥 JSON ({filteredCollectors.length})
            </button>
          </div>

          {/* Page Size */}
          <div className="flex flex-col gap-1 min-w-[80px]">
            <label className="text-xs font-semibold text-stone-700">Per Page</label>
            <Select 
              value={pageSize} 
              onChange={e => setPageSize(Number(e.target.value))}
              className="text-xs py-2 px-3"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </Select>
          </div>

          {/* Search Button */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-semibold text-stone-700">Search</label>
            <button
              onClick={searchErrorCollectors}
              disabled={loading}
              className="text-xs py-2 px-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded border transition-colors flex items-center justify-center gap-2"
              title="Search for error collectors with current filters"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  🔍 Search
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-6xl mb-4 px-6">
          <Alert variant="error">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success Display */}
      {exportSuccess && (
        <div className="w-full max-w-6xl mb-4 px-6">
          <Alert variant="success">
            <AlertTitle>Export Success</AlertTitle>
            <AlertDescription>{exportSuccess}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Results Summary */}
      <div className="w-full max-w-6xl mb-4 px-6">
        <div className="text-center space-y-1">
          <span className="text-sm text-stone-600">
            {loading ? "Loading..." : 
             errorCollectors.length === 0 ? "Click Search to find error collectors" :
             filteredCollectors.length === 0 ? "No error collectors match your filters" :
             `Showing ${paginatedCollectors.length} of ${filteredCollectors.length} error collectors`
            }
          </span>
          {performanceMetrics.totalCollectors && (
            <div className="text-xs text-stone-500">
              Processed {performanceMetrics.totalCollectors} total collectors
              {performanceMetrics.processingTimeMs && ` in ${(performanceMetrics.processingTimeMs / 1000).toFixed(1)}s`}
              {performanceMetrics.hasMore && " (showing first 200 results)"}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="w-full max-w-6xl mb-6 px-6 py-4 rounded-2xl shadow bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-red-600">Loading error collectors...</span>
          </div>
        ) : paginatedCollectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            {errorCollectors.length === 0 ? (
              <>
                <svg className="h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-blue-600 font-medium">
                  Click the Search button to find collectors with errors
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Configure your filters and time range, then search
                </span>
              </>
            ) : (
              <>
                <svg className="h-8 w-8 text-green-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600 font-medium">
                  {filter ? "No error collectors match your filter" : `No collectors with errors found in the ${getCurrentTimeRangeLabel().toLowerCase()}`}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-50 border-b-2 border-red-200">
                  <th className="text-left p-3 font-semibold text-red-800 border-r border-red-200 cursor-pointer hover:bg-red-100" onClick={() => handleSort("functionName")}>Function Name {sortBy === "functionName" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="text-left p-3 font-semibold text-red-800 border-r border-red-200 cursor-pointer hover:bg-red-100" onClick={() => handleSort("collectorType")}>Type {sortBy === "collectorType" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="text-left p-3 font-semibold text-red-800 border-r border-red-200 cursor-pointer hover:bg-red-100" onClick={() => handleSort("customerId")}>Customer ID {sortBy === "customerId" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="text-center p-3 font-semibold text-red-800 border-r border-red-200 cursor-pointer hover:bg-red-100" onClick={() => handleSort("errorCount")}>Error Count {sortBy === "errorCount" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="text-left p-3 font-semibold text-red-800 border-r border-red-200 cursor-pointer hover:bg-red-100" onClick={() => handleSort("lastErrorTime")}>Last Error Time {sortBy === "lastErrorTime" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="text-left p-3 font-semibold text-red-800 border-r border-red-200">SQS Message Count</th>
                  <th className="text-left p-3 font-semibold text-red-800 border-r border-red-200">SQS Queue URL</th>
                  <th className="text-left p-3 font-semibold text-red-800">SQS Enabled</th>
                  <th className="text-left p-3 font-semibold text-red-800 min-w-96">Latest Error</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCollectors.map((collector, index) => (
                  <tr key={`${collector.functionName}-${index}`} className="border-b border-red-100 hover:bg-red-25">
                    <td className="p-3 border-r border-red-100 text-red-800 font-mono text-xs">{collector.functionName}</td>
                    <td className="p-3 border-r border-red-100 text-red-700 text-xs"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{collector.collectorType || 'unknown'}</span></td>
                    <td className="p-3 border-r border-red-100 text-red-700 text-xs"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{collector.customerId || 'unknown'}</span></td>
                    <td className="p-3 border-r border-red-100 text-center"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{collector.errorCount || 1}</span></td>
                    <td className="p-3 border-r border-red-100 text-red-700 text-xs">{collector.errorTimestamp ? formatTimestamp(collector.errorTimestamp) : 'Unknown'}</td>
                    <td className="p-3 border-r border-red-100 text-red-700 text-xs">
                      {typeof collector.sqsMessageCount === "number" ? collector.sqsMessageCount : (collector.pawsStateQueueUrl ? <span>-</span> : <span className="text-stone-400">N/A</span>)}
                    </td>
                    <td className="p-3 border-r border-red-100 text-xs break-words max-w-[200px]">{collector.pawsStateQueueUrl || <span className="text-stone-400">N/A</span>}</td>
                    <td className="p-3 border-r border-red-100 text-xs">
                      {collector.eventSourceMappings && collector.eventSourceMappings.length > 0 ? (
                        collector.eventSourceMappings.map(mapping => (
                          <div key={mapping.UUID} className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={mapping.Enabled}
                                onChange={async (e) => {
                                  setRowLoading(prev => ({ ...prev, [mapping.UUID]: true }));
                                  try {
                                    await fetch("/api/sqs-toggle", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        profile,
                                        region,
                                        functionName: collector.functionName,
                                        uuid: mapping.UUID,
                                        enable: e.target.checked
                                      })
                                    });
                                    // Refresh event source mappings for this collector
                                    const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${collector.functionName}&eventSourceMappings=1`);
                                    const data = await res.json();
                                    setErrorCollectors(prev => prev.map((c, i) => i === (currentPage * pageSize + index) ? { ...c, eventSourceMappings: data.eventSourceMappings || [] } : c));
                                  } catch (err: any) {
                                    setError(err?.message || "Failed to toggle SQS mapping.");
                                  } finally {
                                    setRowLoading(prev => ({ ...prev, [mapping.UUID]: false }));
                                  }
                                }}
                              />
                              <span className={mapping.Enabled ? "text-green-700" : "text-stone-500"}>{mapping.Enabled ? "Enabled" : "Disabled"}</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded disabled:opacity-50"
                                disabled={rowLoading[mapping.UUID] || mapping.Enabled}
                                onClick={async () => {
                                  setRowLoading(prev => ({ ...prev, [mapping.UUID]: true }));
                                  try {
                                    await fetch("/api/sqs-toggle", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        profile,
                                        region,
                                        functionName: collector.functionName,
                                        uuid: mapping.UUID,
                                        enable: true
                                      })
                                    });
                                    const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${collector.functionName}&eventSourceMappings=1`);
                                    const data = await res.json();
                                    setErrorCollectors(prev => prev.map((c, i) => i === (currentPage * pageSize + index) ? { ...c, eventSourceMappings: data.eventSourceMappings || [] } : c));
                                  } catch (err: any) {
                                    setError(err?.message || "Failed to enable SQS mapping.");
                                  } finally {
                                    setRowLoading(prev => ({ ...prev, [mapping.UUID]: false }));
                                  }
                                }}
                              >Enable</button>
                              <button
                                className="px-2 py-1 text-xs bg-stone-400 text-white rounded disabled:opacity-50"
                                disabled={rowLoading[mapping.UUID] || !mapping.Enabled}
                                onClick={async () => {
                                  setRowLoading(prev => ({ ...prev, [mapping.UUID]: true }));
                                  try {
                                    await fetch("/api/sqs-toggle", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        profile,
                                        region,
                                        functionName: collector.functionName,
                                        uuid: mapping.UUID,
                                        enable: false
                                      })
                                    });
                                    const res = await fetch(`/api/lambdas?profile=${profile}&region=${region}&functionName=${collector.functionName}&eventSourceMappings=1`);
                                    const data = await res.json();
                                    setErrorCollectors(prev => prev.map((c, i) => i === (currentPage * pageSize + index) ? { ...c, eventSourceMappings: data.eventSourceMappings || [] } : c));
                                  } catch (err: any) {
                                    setError(err?.message || "Failed to disable SQS mapping.");
                                  } finally {
                                    setRowLoading(prev => ({ ...prev, [mapping.UUID]: false }));
                                  }
                                }}
                              >Disable</button>
                            </div>
                          </div>
                        ))
                      ) : <span className="text-stone-400">No SQS Mapping</span>}
                    </td>
                    <td className="p-3 text-red-700 text-xs">
                      <pre className="whitespace-pre-wrap break-words text-xs font-mono bg-red-50 p-2 rounded border max-w-none overflow-x-auto">{collector.latestError || collector.errorDescription || 'No error description'}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="w-full max-w-6xl mb-6 px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-stone-600">
              Page {currentPage + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                className="px-3 py-1 text-xs border rounded hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                className="px-3 py-1 text-xs border rounded hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}