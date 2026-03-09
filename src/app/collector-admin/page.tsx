"use client";

import { useState, useEffect } from "react";
const REGION_OPTIONS = ["us-east-1", "us-west-2", "eu-west-1"];

export default function CollectorAdminPage() {
  const [collectorType, setCollectorType] = useState("o365");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profile, setProfile] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [action, setAction] = useState("dump_sqs");
  const [batch, setBatch] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("Alert Logic Poll based collector");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [showCollectors, setShowCollectors] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch AWS profiles from API
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/aws-profiles");
        const data = await res.json();
        setProfiles(data);
        if (data.length > 0) {
          setProfile(data[0]);
        }
      } catch {
        setProfiles([]);
      }
    }
    fetchProfiles();
  }, []);

  async function fetchCollectors() {
    setLoading(true);
    setNotification(null);
    let batchData = undefined;
    if (action === "replace_sqs" && batch) {
      try {
        batchData = JSON.parse(batch);
      } catch {
        setNotification({ type: 'error', message: "Invalid batch JSON format" });
        setResult({ ok: false, error: "Invalid batch JSON" } as any);
        setLoading(false);
        return;
      }
    }
    try {
      const res = await fetch("/api/collector-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectorType, profile, region, action, batch: batchData, descriptionFilter }),
      });
      const data = await res.json();
      setResult(data);
      
      if (data.ok) {
        if (data.results && Array.isArray(data.results)) {
          setCollectors(data.results);
          setShowCollectors(true);
          const successMessage = `Successfully processed ${data.results.length} collector(s) with action: ${action}`;
          setNotification({ type: 'success', message: successMessage });
        } else {
          setCollectors([]);
          setShowCollectors(false);
          setNotification({ type: 'success', message: 'Operation completed successfully' });
        }
      } else {
        setCollectors([]);
        setShowCollectors(false);
        setNotification({ type: 'error', message: data.error || 'Operation failed' });
      }
    } catch (error: any) {
      setResult({ ok: false, error: error.message });
      setCollectors([]);
      setShowCollectors(false);
      setNotification({ type: 'error', message: `AWS operation failed: ${error.message}` });
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Basic validation
    if (!collectorType.trim() || !profile || !region) {
      setNotification({ type: 'error', message: 'Please fill in all required fields (Collector Type, Profile, Region)' });
      return;
    }
    
    await fetchCollectors();
  }

  return (
    <div className="max-w-full mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Collector Admin</h1>
      
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-md flex justify-between items-center ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-4 text-lg font-bold hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>Profile: </label>
          <select value={profile} onChange={e => setProfile(e.target.value)} className="border px-2 py-1 w-full">
            {profiles.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label>Region: </label>
          <select value={region} onChange={e => setRegion(e.target.value)} className="border px-2 py-1 w-full">
            {REGION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label>Collector Type: </label>
          <input value={collectorType} onChange={e => setCollectorType(e.target.value)} className="border px-2 py-1 w-full" />
        </div>
        <div>
          <label>Action: </label>
          <select value={action} onChange={e => setAction(e.target.value)} className="border px-2 py-1 w-full">
            <option value="dump_sqs">Dump SQS Messages</option>
            <option value="update_streams">Update Streams</option>
            <option value="disable_sqs">Disable SQS Polling</option>
            <option value="enable_sqs">Enable SQS Polling</option>
            <option value="replace_sqs">Replace SQS Messages</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label>Description Filter: </label>
          <input value={descriptionFilter} onChange={e => setDescriptionFilter(e.target.value)} className="border px-2 py-1 w-full" />
        </div>
        {action === "replace_sqs" && (
          <div className="md:col-span-2">
            <label>Batch JSON: </label>
            <textarea value={batch} onChange={e => setBatch(e.target.value)} className="border px-2 py-1 w-full h-24" />
          </div>
        )}
        {/* Submit and Control Section */}
        <div className="md:col-span-2 mt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => {
                    setAutoRefresh(e.target.checked);
                    if (e.target.checked && showCollectors) {
                      const interval = setInterval(fetchCollectors, 15000); // Refresh every 15 seconds
                      setRefreshInterval(interval);
                    } else if (refreshInterval) {
                      clearInterval(refreshInterval);
                      setRefreshInterval(null);
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Auto-refresh (15s)</span>
              </label>
              {showCollectors && (
                <button 
                  onClick={fetchCollectors}
                  disabled={loading}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Refreshing..." : "Refresh Now"}
                </button>
              )}
            </div>
            <div className="flex justify-center">
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={loading}
              >
                {loading ? "Processing..." : "Run"}
              </button>
            </div>
          </div>
        </div>
      </form>
      {showCollectors && collectors.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Collectors</h2>
            <button 
              onClick={() => {
                const dataStr = JSON.stringify(collectors, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `collectors-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Download JSON
            </button>
          </div>
          <div className="w-full">
            <table className="w-full border text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-2 border w-40">Name</th>
                  <th className="px-1 py-2 border w-20">Customer ID</th>
                  <th className="px-1 py-2 border w-24">Collector ID</th>
                  <th className="px-1 py-2 border w-20">Status</th>
                  <th className="px-1 py-2 border w-24">SQS Enabled</th>
                  <th className="px-1 py-2 border w-16">Count</th>
                  <th className="px-1 py-2 border w-16">Visible</th>
                  <th className="px-1 py-2 border w-16">In Flight</th>
                  <th className="px-1 py-2 border w-16">Delayed</th>
                  <th className="px-2 py-2 border">Queue URL</th>
                </tr>
              </thead>
              <tbody>
                {collectors.map((c, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2 border font-mono text-xs break-words leading-tight" title={c.name}>{c.name}</td>
                    <td className="px-1 py-2 border text-xs truncate text-center" title={c.cid || c.customerId}>{c.cid || c.customerId || "-"}</td>
                    <td className="px-1 py-2 border text-xs truncate text-center" title={c.collectorId}>{c.collectorId || "-"}</td>
                    <td className="px-1 py-2 border text-xs truncate text-center" title={c.status || c.statusText}>{c.status || c.statusText || "-"}</td>
                    <td className="px-1 py-2 border text-center">
                      <span className={`px-2 py-1 rounded text-xs ${c.sqsEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {c.sqsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-1 py-2 border text-xs text-center">{c.count !== undefined && c.count !== null ? c.count : "-"}</td>
                    <td className="px-1 py-2 border text-xs text-center">{c.sqsAttributes?.ApproximateNumberOfMessages || "0"}</td>
                    <td className="px-1 py-2 border text-xs text-center">{c.sqsAttributes?.ApproximateNumberOfMessagesNotVisible || "0"}</td>
                    <td className="px-1 py-2 border text-xs text-center">{c.sqsAttributes?.ApproximateNumberOfMessagesDelayed || "0"}</td>
                    <td className="px-2 py-2 border font-mono text-xs break-words leading-tight" title={c.queueUrl}>{c.queueUrl || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {result && !showCollectors && (
        <div className="mt-6">
          <h2 className="font-semibold">Result:</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
