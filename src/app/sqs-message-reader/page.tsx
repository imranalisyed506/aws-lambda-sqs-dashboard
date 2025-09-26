"use client";

import { useState, useEffect } from "react";
const PROFILE_OPTIONS = ["paws_integration", "paws"];
const REGION_OPTIONS = ["us-east-1", "us-west-2", "eu-west-1"];

interface MessageData {
  functionName: string;
  customerId: string;
  collectorId: string;
  queueUrl: string;
  sqsEnabled: boolean;
  sqsAttributes: any;
  messages?: {
    body: any;
    since?: string;
    until?: string;
    stream?: string;
    messageId?: string;
    timestamp?: string;
    receiptHandle?: string;
  }[];
  latestMessage?: {
    body: any;
    since?: string;
    until?: string;
    stream?: string;
    messageId?: string;
    timestamp?: string;
  };
  configUpdate?: {
    success: boolean;
    message: string;
    currentConfig?: any;
    updatedConfig?: any;
    extractedData?: { since?: string; until?: string; stream?: string };
    streamMismatch?: boolean;
    configStream?: string;
    sqsStream?: string;
  };
  error?: string;
}

export default function SqsMessageReaderPage() {
  const [collectorType, setCollectorType] = useState("o365");
  const [profile, setProfile] = useState(PROFILE_OPTIONS[0]);
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [descriptionFilter, setDescriptionFilter] = useState("Alert Logic Poll based collector");
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState<MessageData[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [accesskey, setAccesskey] = useState("");
  const [secretkey, setSecretkey] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [configUpdateLoading, setConfigUpdateLoading] = useState<string | null>(null);
  const [getConfigLoading, setGetConfigLoading] = useState<string | null>(null);
  const [configFlyout, setConfigFlyout] = useState<{
    show: boolean;
    collectorId: string;
    customerId: string;
    config: any;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [expandedCollectors, setExpandedCollectors] = useState<Set<string>>(new Set());

  // Load saved credentials from localStorage on component mount
  useEffect(() => {
    const savedAccessKey = localStorage.getItem('alertLogicAccessKey');
    const savedSecretKey = localStorage.getItem('alertLogicSecretKey');
    const savedAuthToken = localStorage.getItem('alertLogicAuthToken');
    
    if (savedAccessKey && savedSecretKey) {
      setAccesskey(savedAccessKey);
      setSecretkey(savedSecretKey);
      setCredentialsSaved(true);
    }
    
    if (savedAuthToken) {
      setAuthToken(savedAuthToken);
    }
  }, []);

  // Function to save credentials and get auth token
  async function saveCredentials() {
    if (!accesskey.trim() || !secretkey.trim()) {
      setNotification({ type: 'error', message: 'Please enter both access key and secret key' });
      return;
    }

    try {
      // Save to localStorage
      localStorage.setItem('alertLogicAccessKey', accesskey.trim());
      localStorage.setItem('alertLogicSecretKey', secretkey.trim());
      
      // Test authentication by making a simple API call
      const authTestResponse = await fetch('/api/sqs-message-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testAuth: true,
          username: accesskey.trim(),
          password: secretkey.trim()
        })
      });

      if (authTestResponse.ok) {
        const result = await authTestResponse.json();
        if (result.authToken) {
          localStorage.setItem('alertLogicAuthToken', result.authToken);
          setAuthToken(result.authToken);
        }
        setCredentialsSaved(true);
        setNotification({ type: 'success', message: 'Credentials saved successfully!' });
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to save credentials or authenticate' });
    }
  }

  // Function to clear saved credentials
  function clearCredentials() {
    localStorage.removeItem('alertLogicAccessKey');
    localStorage.removeItem('alertLogicSecretKey');
    localStorage.removeItem('alertLogicAuthToken');
    setAccesskey('');
    setSecretkey('');
    setAuthToken(null);
    setCredentialsSaved(false);
    setNotification({ type: 'success', message: 'Credentials cleared' });
  }

  // Function to get current collector configuration
  async function getCollectorConfig(collector: MessageData) {
    if (!accesskey.trim() || !secretkey.trim()) {
      setNotification({ type: 'error', message: 'Please enter access key and secret key first' });
      return;
    }

    setGetConfigLoading(collector.collectorId);

    try {
      const requestBody = {
        customerId: collector.customerId,
        collectorId: collector.collectorId,
        username: accesskey.trim(),
        password: secretkey.trim(),
        getOnly: true
      };

      const res = await fetch("/api/sqs-message-reader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.ok && data.currentConfig) {
        // Show config in flyout instead of updating table
        setConfigFlyout({
          show: true,
          collectorId: collector.collectorId,
          customerId: collector.customerId,
          config: data.currentConfig
        });
        setNotification({ type: 'success', message: `Configuration retrieved for collector ${collector.collectorId}` });
      } else {
        throw new Error(data.error || 'Failed to retrieve configuration');
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: `Get config failed: ${error.message}` });
    } finally {
      setGetConfigLoading(null);
    }
  }

  // New function for updating collector configuration
  async function updateCollectorConfig(collector: MessageData) {
    if (!accesskey.trim() || !secretkey.trim()) {
      setNotification({ type: 'error', message: 'Please enter access key and secret key first' });
      return;
    }

    if (!collector.latestMessage?.since && !collector.latestMessage?.until && !collector.latestMessage?.stream) {
      setNotification({ type: 'error', message: 'No extractable data found for this collector' });
      return;
    }

    setConfigUpdateLoading(collector.collectorId);

    try {
      // Step 1: Get current config to validate stream values
      console.log('🔍 [DEBUG] Step 1: Getting current config for stream validation');
      
      const getConfigBody = {
        customerId: collector.customerId,
        collectorId: collector.collectorId,
        username: accesskey.trim(),
        password: secretkey.trim(),
        getOnly: true
      };

      const getConfigRes = await fetch("/api/sqs-message-reader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getConfigBody),
      });

      if (!getConfigRes.ok) {
        throw new Error(`Failed to get config: HTTP ${getConfigRes.status}: ${getConfigRes.statusText}`);
      }

      const getConfigData = await getConfigRes.json();

      if (!getConfigData.ok || !getConfigData.currentConfig) {
        throw new Error('Failed to retrieve current configuration for stream validation');
      }

      // Step 2: Validate stream values on frontend before attempting update
      console.log('🔍 [DEBUG] Step 2: Validating stream values');
      
      const currentConfig = getConfigData.currentConfig;
      let configStreamValue = null;
      
      // Look for stream value in various possible paths
      const possiblePaths = [
        'paws_config.stream',
        'pawsConfig.stream', 
        'config.stream',
        'stream'
      ];
      
      for (const path of possiblePaths) {
        const pathParts = path.split('.');
        let current = currentConfig;
        
        for (const part of pathParts) {
          if (current && typeof current === 'object' && current[part] !== undefined) {
            current = current[part];
          } else {
            current = null;
            break;
          }
        }
        
        if (current && typeof current === 'string') {
          configStreamValue = current;
          console.log(`Found stream in config at path '${path}':`, configStreamValue);
          break;
        }
      }

      const sqsStreamValue = collector.latestMessage?.stream;
      
      console.log('🔍 [DEBUG] Stream comparison:');
      console.log('  Config stream:', configStreamValue || 'undefined');
      console.log('  SQS stream:', sqsStreamValue || 'undefined');
      
      // Check if streams match (case-insensitive)
      const streamsMatch = configStreamValue && sqsStreamValue && 
                          configStreamValue.trim().toLowerCase() === sqsStreamValue.trim().toLowerCase();
      
      console.log('  Streams match:', streamsMatch);
      
      if (!streamsMatch) {
        const streamErrorMsg = `❌ Stream mismatch: Config has '${configStreamValue || 'undefined'}' but SQS message has '${sqsStreamValue || 'undefined'}'. Update aborted.`;
        console.log('🚫 [DEBUG] Stream validation failed - aborting update');
        
        setNotification({ type: 'error', message: streamErrorMsg });
        
        // Update collector with stream mismatch error without calling PUT API
        setCollectors(prev => prev.map(c => 
          c.collectorId === collector.collectorId 
            ? { ...c, configUpdate: { 
                success: false, 
                message: streamErrorMsg,
                streamMismatch: true,
                configStream: configStreamValue || undefined,
                sqsStream: sqsStreamValue
              }}
            : c
        ));
        return; // Exit early - don't proceed with update
      }

      console.log('✅ [DEBUG] Stream validation passed - proceeding with config update');

      // Step 3: Proceed with update since streams match
      const updateRequestBody = {
        customerId: collector.customerId,
        collectorId: collector.collectorId,
        username: accesskey.trim(),
        password: secretkey.trim(),
        updateOnly: true,
        extractedData: {
          since: collector.latestMessage?.since,
          until: collector.latestMessage?.until,
          stream: collector.latestMessage?.stream
        }
      };

      const res = await fetch("/api/sqs-message-reader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateRequestBody),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.ok && data.configUpdate) {
        // Update the specific collector in the results
        setCollectors(prev => prev.map(c => 
          c.collectorId === collector.collectorId 
            ? { ...c, configUpdate: data.configUpdate }
            : c
        ));
        setNotification({ type: 'success', message: `✅ Configuration updated for collector ${collector.collectorId}` });
      } else {
        // This shouldn't happen since we pre-validated streams, but handle just in case
        if (data.configUpdate?.streamMismatch) {
          const streamErrorMsg = `Stream mismatch: Config stream '${data.configUpdate.configStream || 'undefined'}' ≠ SQS stream '${data.configUpdate.sqsStream || 'undefined'}'`;
          setNotification({ type: 'error', message: streamErrorMsg });
          setCollectors(prev => prev.map(c => 
            c.collectorId === collector.collectorId 
              ? { ...c, configUpdate: { 
                  success: false, 
                  message: streamErrorMsg,
                  streamMismatch: true,
                  configStream: data.configUpdate.configStream,
                  sqsStream: data.configUpdate.sqsStream
                }}
              : c
          ));
        } else {
          throw new Error(data.error || 'Configuration update failed');
        }
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: `Config update failed: ${error.message}` });
      // Update the specific collector with error
      setCollectors(prev => prev.map(c => 
        c.collectorId === collector.collectorId 
          ? { ...c, configUpdate: { success: false, message: error.message } }
          : c
      ));
    } finally {
      setConfigUpdateLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Basic validation
    if (!collectorType.trim() || !profile || !region) {
      setNotification({ type: 'error', message: 'Please fill in all required fields (Collector Type, Profile, Region)' });
      return;
    }
    
    await fetchMessages();
  }

  async function fetchMessages() {
    setLoading(true);
    setNotification(null);

    try {
      const requestBody: any = { 
        collectorType: collectorType.trim(), 
        profile, 
        region, 
        descriptionFilter: descriptionFilter.trim() 
      };
      
      const res = await fetch("/api/sqs-message-reader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.ok) {
        setCollectors(data.results || []);
        setShowResults(true);
        const successCount = (data.results || []).filter((c: MessageData) => !c.error && c.latestMessage).length;
        const totalCount = data.results?.length || 0;
        const successMessage = `Successfully read messages from ${successCount}/${totalCount} collector(s)`;
        setNotification({ type: 'success', message: successMessage });
      } else {
        setCollectors([]);
        setShowResults(false);
        setNotification({ type: 'error', message: data.error || 'Operation failed' });
      }
    } catch (error: any) {
      console.error('API Error:', error);
      setCollectors([]);
      setShowResults(false);
      const errorMessage = error?.message || 'Unknown error occurred';
      setNotification({ type: 'error', message: `Failed to read SQS messages: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }

  // Cleanup auto-refresh interval on component unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Handle ESC key for closing modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && configFlyout?.show) {
        setConfigFlyout(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [configFlyout?.show]);

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setNotification({ type: 'success', message: 'Copied to clipboard!' });
      setTimeout(() => setNotification(null), 2000);
    }).catch(() => {
      setNotification({ type: 'error', message: 'Failed to copy to clipboard' });
    });
  };

  return (
    <div className="max-w-full mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">SQS Message Reader</h1>
      <p className="text-gray-600 mb-6">
        Read the latest SQS message body from collectors and extract since/until date values.
        Then update collector configurations with extracted data using Alert Logic API.
      </p>
      
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Profile:</label>
          <select 
            value={profile} 
            onChange={e => setProfile(e.target.value)} 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROFILE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region:</label>
          <select 
            value={region} 
            onChange={e => setRegion(e.target.value)} 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {REGION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Collector Type:</label>
          <input 
            value={collectorType} 
            onChange={e => setCollectorType(e.target.value)} 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., sophossiem"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description Filter:</label>
          <input 
            value={descriptionFilter} 
            onChange={e => setDescriptionFilter(e.target.value)} 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Alert Logic Poll based collector"
          />
        </div>
        

        
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
                    if (e.target.checked && showResults) {
                      const interval = setInterval(fetchMessages, 15000); // Refresh every 15 seconds
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
              {showResults && (
                <button 
                  onClick={fetchMessages}
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
                {loading ? "Reading Messages..." : "Read Latest Messages"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {showResults && collectors.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">SQS Messages</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">View:</label>
                <select 
                  value={viewMode} 
                  onChange={(e) => setViewMode(e.target.value as 'summary' | 'detailed')}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="summary">Summary (Latest Message Only)</option>
                  <option value="detailed">Detailed (All Messages)</option>
                </select>
              </div>
            </div>
            <button 
              onClick={() => {
                const dataStr = JSON.stringify(collectors, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `sqs-messages-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
            >
              Download JSON
            </button>
          </div>

          {/* Configuration Update Section - Shows after reading messages */}
          {collectors.some(c => c.latestMessage?.since || c.latestMessage?.until || c.latestMessage?.stream) && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
              <h3 className="text-lg font-semibold text-orange-800 mb-3">📋 Update Collector Configurations</h3>
              <p className="text-orange-700 text-sm mb-4">
                Found extractable data (since/until/stream) in <strong>{collectors.filter(c => c.latestMessage?.since || c.latestMessage?.until || c.latestMessage?.stream).length}</strong> collector(s). 
                Enter your Alert Logic credentials below, then use the "Update Config" buttons in the table to update configurations individually.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔑 Access Key:
                    {credentialsSaved && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Saved</span>}
                  </label>
                  <input 
                    type="text"
                    value={accesskey} 
                    onChange={e => {
                      setAccesskey(e.target.value);
                      setCredentialsSaved(false);
                    }} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Alert Logic access key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔐 Secret Key:
                    {authToken && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Token Active</span>}
                  </label>
                  <input 
                    type="password"
                    value={secretkey} 
                    onChange={e => {
                      setSecretkey(e.target.value);
                      setCredentialsSaved(false);
                    }} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Alert Logic secret key"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={saveCredentials}
                  disabled={!accesskey.trim() || !secretkey.trim()}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  💾 {credentialsSaved ? 'Update Credentials' : 'Save & Authenticate'}
                </button>
                {credentialsSaved && (
                  <button
                    onClick={clearCredentials}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2"
                  >
                    🗑️ Clear Credentials
                  </button>
                )}
              </div>
              
              <div className="text-sm text-orange-600 bg-orange-100 p-3 rounded border">
                <div className="font-medium mb-1">🔄 Workflow:</div>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Authenticate with Alert Logic using access key/secret key</li>
                  <li>GET current configuration from Alert Logic API</li>
                  <li>Merge extracted SQS data with existing configuration</li>
                  <li>PUT updated configuration back to Alert Logic API</li>
                  <li>Show detailed success/failure results</li>
                </ol>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse bg-white text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 sticky top-0">
                  <th className="border-r border-gray-300 px-4 py-3 text-left font-semibold text-gray-700 w-52">Function Name</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-28">Customer ID</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-28">Collector ID</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-28">SQS Enabled</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-20">Visible</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-20">In Flight</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-20">Delayed</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-36">Since Date</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-36">Until Date</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 w-36">Stream</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 w-80">Queue URL</th>
                  <th className="border-r border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 w-96">Message Body</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collectors.map((collector, i) => (
                  <tr key={i} className={`border-b border-gray-200 transition-all duration-200 ${
                    i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
                  } hover:bg-blue-50/80 hover:shadow-md`}>
                    <td 
                      className="border-r border-gray-200 px-4 py-4 font-mono text-xs cursor-pointer hover:bg-blue-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.functionName)}
                      title="Click to copy function name"
                    >
                      <div className="break-all group-hover:text-blue-700 font-medium">{collector.functionName}</div>
                    </td>
                    <td 
                      className="border-r border-gray-200 px-3 py-4 text-center text-xs font-semibold cursor-pointer hover:bg-green-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.customerId || '')}
                      title="Click to copy customer ID"
                    >
                      <div className="group-hover:text-green-700">{collector.customerId || "-"}</div>
                    </td>
                    <td 
                      className="border-r border-gray-200 px-3 py-4 text-center text-xs font-semibold cursor-pointer hover:bg-green-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.collectorId || '')}
                      title="Click to copy collector ID"
                    >
                      <div className="group-hover:text-green-700">{collector.collectorId || "-"}</div>
                    </td>
                    <td className="border-r border-gray-200 px-3 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        collector.sqsEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {collector.sqsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-3 py-4 text-center font-mono text-sm">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                        {collector.sqsAttributes?.ApproximateNumberOfMessages || "0"}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-3 py-4 text-center font-mono text-sm">
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                        {collector.sqsAttributes?.ApproximateNumberOfMessagesNotVisible || "0"}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-3 py-4 text-center font-mono text-sm">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                        {collector.sqsAttributes?.ApproximateNumberOfMessagesDelayed || "0"}
                      </span>
                    </td>
                    <td 
                      className="border-r border-gray-200 px-3 py-4 text-center font-mono text-xs cursor-pointer hover:bg-cyan-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.latestMessage?.since || '')}
                      title="Click to copy since date"
                    >
                      {collector.latestMessage?.since ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300 font-semibold group-hover:bg-green-200">
                          {collector.latestMessage.since}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td 
                      className="border-r border-gray-200 px-3 py-4 text-center font-mono text-xs cursor-pointer hover:bg-cyan-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.latestMessage?.until || '')}
                      title="Click to copy until date"
                    >
                      {collector.latestMessage?.until ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300 font-semibold group-hover:bg-blue-200">
                          {collector.latestMessage.until}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td 
                      className="border-r border-gray-200 px-3 py-4 text-center font-mono text-xs cursor-pointer hover:bg-purple-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.latestMessage?.stream || '')}
                      title="Click to copy stream name"
                    >
                      {collector.latestMessage?.stream ? (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded border border-purple-300 font-semibold group-hover:bg-purple-200 truncate block">
                          {collector.latestMessage.stream}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td 
                      className="border-r border-gray-200 px-3 py-4 cursor-pointer hover:bg-red-100 transition-all duration-200 group"
                      onClick={() => copyToClipboard(collector.queueUrl || '')}
                      title={`Click to copy full queue URL: ${collector.queueUrl || 'N/A'}`}
                    >
                      {collector.queueUrl ? (
                        <div className="font-mono text-xs text-gray-600 break-all p-1 group-hover:text-gray-800">
                          {collector.queueUrl}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-4">
                      {collector.error ? (
                        <div 
                          className="text-red-600 cursor-pointer p-2 rounded bg-red-50 border border-red-200"
                          onClick={() => copyToClipboard(collector.error || '')}
                          title="Click to copy error message"
                        >
                          ❌ {collector.error}
                        </div>
                      ) : collector.latestMessage ? (
                        <div 
                          className="text-xs text-gray-600 bg-gray-50 p-3 rounded border cursor-pointer max-h-32 overflow-y-auto hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            const bodyText = typeof collector.latestMessage?.body === 'string' 
                              ? collector.latestMessage.body 
                              : JSON.stringify(collector.latestMessage?.body, null, 2);
                            copyToClipboard(bodyText);
                          }}
                          title="Click to copy message body"
                        >
                          {typeof collector.latestMessage.body === 'string' 
                            ? collector.latestMessage.body 
                            : JSON.stringify(collector.latestMessage.body, null, 2)
                          }
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No message</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => getCollectorConfig(collector)}
                          disabled={loading || getConfigLoading === collector.collectorId || !collector.customerId || !collector.collectorId}
                          className="w-full text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {getConfigLoading === collector.collectorId ? 'Getting...' : 'Get Config'}
                        </button>
                        <button
                          onClick={() => updateCollectorConfig(collector)}
                          disabled={loading || configUpdateLoading === collector.collectorId || !collector.customerId || !collector.collectorId}
                          className={`w-full text-xs px-2 py-1 rounded disabled:bg-gray-300 disabled:cursor-not-allowed ${
                            collector.configUpdate?.streamMismatch
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : collector.configUpdate?.success
                              ? 'bg-green-500 text-white hover:bg-green-600' 
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {configUpdateLoading === collector.collectorId 
                            ? 'Updating...' 
                            : collector.configUpdate?.streamMismatch
                            ? '❌ Stream Mismatch'
                            : collector.configUpdate?.success 
                            ? '✅ Updated' 
                            : 'Update Config'
                          }
                        </button>
                        {collector.configUpdate?.streamMismatch && (
                          <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-1 rounded mt-1">
                            <div className="font-medium">⚠️ Stream Mismatch:</div>
                            <div>Config: {collector.configUpdate.configStream || 'undefined'}</div>
                            <div>SQS: {collector.configUpdate.sqsStream || 'undefined'}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration Flyout Modal */}
      {configFlyout?.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setConfigFlyout(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📋 Current Configuration
              </h3>
              <button
                onClick={() => setConfigFlyout(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Customer ID:</span>
                  <div className="font-mono bg-gray-100 p-2 rounded mt-1">{configFlyout.customerId}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Collector ID:</span>
                  <div className="font-mono bg-gray-100 p-2 rounded mt-1">{configFlyout.collectorId}</div>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Current Configuration:</span>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded mt-2">
                  <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                    {JSON.stringify(configFlyout.config, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(configFlyout.config, null, 2));
                    setNotification({ type: 'success', message: 'Configuration copied to clipboard!' });
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                >
                  📋 Copy Config
                </button>
                <button
                  onClick={() => setConfigFlyout(null)}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}