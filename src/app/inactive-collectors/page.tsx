"use client";

import React, { useState, useEffect, useRef } from "react";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DEFAULT_PROFILE,
  DEFAULT_REGION,
  PROFILE_OPTIONS,
  REGION_OPTIONS,
} from "@/app/config";
import { logMessage, getLogMessages, clearLogMessages } from "@/lib/utils";

// Debug logging utility
const debugLog = (message: string, data?: any) => {
  // Always log in development, or when DEBUG is enabled
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    console.log(`[INACTIVE-COLLECTORS] ${timestamp}: ${message}`, data || '');
  }
};

interface Collector {
  functionName: string;
  collectorName: string;
  pawsTypeName: string;
  customerId: string;
  collectorId: string;
  stackName: string;
  lastModified: string;
  runtime: string;
  memorySize: number;
  description: string;
}

interface InactiveUser {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  modifiedAt: string;
}

interface InactiveUserCollectors {
  customerId: string;
  collectors: Collector[];
}

// Column settings interface
interface ColumnSettings {
  customerid: boolean;
  functionName: boolean;
  collectorName: boolean;
  collectorType: boolean;
  stackName: boolean;
  lastModified: boolean;
  runtime: boolean;
  memorySize: boolean;
  description: boolean;
}

// Default column settings
const defaultColumnSettings: ColumnSettings = {
  customerid: true,
  functionName: true,
  collectorName: true,
  collectorType: true,
  stackName: true,
  lastModified: true,
  runtime: false,
  memorySize: false,
  description: false,
};

export default function InactiveCollectorsPage() {
  const [profile, setProfile] = useState("paws");
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [accesskey, setAccesskey] = useState("");
  const [secretkey, setSecretkey] = useState("");
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [inactiveCollectors, setInactiveCollectors] = useState<InactiveUserCollectors[]>([]);
  const [filteredCollectors, setFilteredCollectors] = useState<InactiveUserCollectors[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollectorType, setSelectedCollectorType] = useState("");
  const [deletingCollectors, setDeletingCollectors] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [collectorToDelete, setCollectorToDelete] = useState<{customerId: string, collectorId: string, functionName: string} | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [customerToDeleteAll, setCustomerToDeleteAll] = useState<{customerId: string, collectorsCount: number} | null>(null);
  
  // Column settings state
  const [columnSettings, setColumnSettings] = useState<ColumnSettings>(defaultColumnSettings);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Debug state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Test logging on component mount
  useEffect(() => {
    debugLog('InactiveCollectorsPage component mounted');
    logMessage('info', 'Component initialized with DEBUG enabled');
  }, []);
  // LocalStorage for token management
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('inactive-collectors-token');
      if (savedToken) {
        setToken(savedToken);
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Save token to localStorage when authenticated
  const saveTokenToStorage = (authToken: string) => {
    if (typeof window !== 'undefined') {
      debugLog('Saving token to localStorage');
      localStorage.setItem('inactive-collectors-token', authToken);
    }
  };

  // Logout function
  const handleLogout = () => {
    debugLog('Logout initiated, clearing localStorage and state');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('inactive-collectors-token');
    }
    setToken("");
    setIsAuthenticated(false);
    setAccesskey("");
    setSecretkey("");
    setInactiveUsers([]);
    setInactiveCollectors([]);
    setFilteredCollectors([]);
    setError("");
    setSuccess("");
    debugLog('Logout completed');
  };

  // LocalStorage keys
  const TOKEN_KEY = 'inactive-collectors-token';
  const COLUMN_SETTINGS_KEY = 'inactive-collectors-columns';

  // Load saved data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      debugLog('Loading saved data from localStorage');
      // Load saved token
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        debugLog('Found saved token in localStorage');
        setToken(savedToken);
        setIsAuthenticated(true);
      } else {
        debugLog('No saved token found in localStorage');
      }

      // Load saved column settings
      const savedColumns = localStorage.getItem(COLUMN_SETTINGS_KEY);
      if (savedColumns) {
        try {
          const parsedSettings = JSON.parse(savedColumns);
          debugLog('Loaded column settings from localStorage', parsedSettings);
          setColumnSettings(parsedSettings);
        } catch (error) {
          debugLog('Error parsing saved column settings', error);
        }
      } else {
        debugLog('No saved column settings found, using defaults');
      }
    }
  }, []);

  // Refresh debug logs periodically in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
      const interval = setInterval(() => {
        setDebugLogs(getLogMessages());
      }, 1000); // Update every second
      
      return () => clearInterval(interval);
    }
  }, []);

  // Save column settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      debugLog('Saving column settings to localStorage', columnSettings);
      localStorage.setItem(COLUMN_SETTINGS_KEY, JSON.stringify(columnSettings));
    }
  }, [columnSettings]);

  // Handle column setting change
  const handleColumnChange = (column: keyof ColumnSettings) => {
    debugLog('Column setting changed', { column, newValue: !columnSettings[column] });
    setColumnSettings(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Export data to JSON
  const exportToJson = () => {
    debugLog('Starting JSON export', { 
      inactiveUsers: inactiveUsers.length,
      filteredCollectors: filteredCollectors.length 
    });
    
    const dataToExport = {
      exportDate: new Date().toISOString(),
      inactiveUsers,
      inactiveCollectors: filteredCollectors,
      totalUsers: inactiveUsers.length,
      totalCollectors: totalCollectors,
      profileUsed: profile,
      regionUsed: region
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `inactive-collectors-${new Date().toISOString().split('T')[0]}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    debugLog('JSON export completed', { filename });
  };

  // Authentication handler
  const handleAuthentication = async () => {
    debugLog('Starting authentication process', { accesskey: accesskey ? 'provided' : 'missing' });
    
    if (!accesskey || !secretkey) {
      debugLog('Authentication failed: missing credentials');
      setError("Please enter access key and secret key");
      return;
    }

    setLoading(true);
    setError("");
    debugLog('Sending authentication request to /api/auth');

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: accesskey, password: secretkey }),
      });

      const data = await response.json();
      debugLog('Authentication response received', { success: data.success, hasToken: !!data.token });

      if (data.success) {
        setToken(data.token);
        setIsAuthenticated(true);
        setSuccess("Authentication successful!");
        setSecretkey(""); // Clear secret key for security
        saveTokenToStorage(data.token);
        debugLog('Authentication successful, token saved to localStorage');
      } else {
        debugLog('Authentication failed', { error: data.error });
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError("Network error during authentication");
      logMessage("error", "Authentication error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inactive collectors
  const fetchInactiveCollectors = async () => {
    if (!token) {
      debugLog('Cannot fetch collectors: no token available');
      return;
    }

    debugLog('Starting fetch inactive collectors', { profile, region, selectedCollectorType });
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        profile,
        region,
      });
      if (selectedCollectorType) {
        params.append('collectorType', selectedCollectorType);
      }

      debugLog('Sending request to /api/inactive-collectors', { params: params.toString() });
      const response = await fetch(`/api/inactive-collectors?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      debugLog('Response received from /api/inactive-collectors', { 
        ok: response.ok, 
        status: response.status,
        totalUsers: data.totalInactiveUsers,
        totalCollectors: data.totalInactiveCollectors 
      });

      if (response.ok) {
        setInactiveUsers(data.inactiveUsers || []);
        setInactiveCollectors(data.inactiveUsersCollectors || []);
        setFilteredCollectors(data.inactiveUsersCollectors || []);
        const successMsg = `Found ${data.totalInactiveUsers} inactive users with ${data.totalInactiveCollectors} collectors`;
        setSuccess(successMsg);
        debugLog('Data successfully loaded', { 
          inactiveUsers: data.inactiveUsers?.length,
          collectors: data.inactiveUsersCollectors?.length 
        });
      } else {
        const errorMsg = data.error || "Failed to fetch inactive collectors";
        setError(errorMsg);
        debugLog('API request failed', { error: errorMsg, status: response.status });
      }
    } catch (err) {
      const errorMsg = "Network error while fetching collectors";
      setError(errorMsg);
      debugLog('Network error occurred', err);
      logMessage("error", "Fetch error:", err);
    } finally {
      setLoading(false);
      debugLog('Fetch inactive collectors completed');
    }
  };

  // Filter collectors based on search term and collector type
  useEffect(() => {
    debugLog('Filtering collectors', { 
      searchTerm, 
      selectedCollectorType, 
      totalCollectors: inactiveCollectors.length 
    });
    
    let filtered = inactiveCollectors;

    if (searchTerm) {
      filtered = filtered
        .map(user => ({
          ...user,
          collectors: user.collectors.filter(collector =>
            collector.functionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            collector.collectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            collector.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            collector.stackName?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }))
        .filter(user => user.collectors.length > 0);
      
      debugLog('Applied search filter', { 
        searchTerm, 
        filteredCount: filtered.length 
      });
    }

    if (selectedCollectorType && selectedCollectorType !== "") {
      filtered = filtered
        .map(user => ({
          ...user,
          collectors: user.collectors.filter(collector =>
            collector.collectorName === selectedCollectorType
          )
        }))
        .filter(user => user.collectors.length > 0);
      
      debugLog('Applied collector type filter', { 
        selectedCollectorType, 
        filteredCount: filtered.length 
      });
    }

    setFilteredCollectors(filtered);
    const totalFilteredCollectors = filtered.reduce((sum, user) => sum + user.collectors.length, 0);
    debugLog('Filtering completed', { 
      finalCount: filtered.length,
      totalCollectors: totalFilteredCollectors
    });
  }, [searchTerm, selectedCollectorType, inactiveCollectors]);

  // Delete collector handler
  const handleDeleteCollector = async (customerId: string, collectorId: string, functionName: string) => {
    debugLog('Delete collector initiated', { customerId, collectorId, functionName });
    setCollectorToDelete({ customerId, collectorId, functionName });
    setShowDeleteDialog(true);
  };

  // Bulk delete handler
  const handleDeleteAllForCustomer = async (customerId: string) => {
    const customer = filteredCollectors.find(c => c.customerId === customerId);
    if (customer) {
      debugLog('Bulk delete initiated', { customerId, collectorsCount: customer.collectors.length });
      setCustomerToDeleteAll({ customerId, collectorsCount: customer.collectors.length });
      setShowBulkDeleteDialog(true);
    }
  };

  const confirmDeleteCollector = async () => {
    if (!collectorToDelete || !token) {
      debugLog('Cannot delete collector: missing data or token');
      return;
    }

    const { customerId, collectorId, functionName } = collectorToDelete;
    const deleteKey = `${customerId}-${collectorId}`;
    
    debugLog('Starting collector deletion', { customerId, collectorId, functionName });
    setDeletingCollectors(prev => new Set(prev).add(deleteKey));
    setError("");
    setShowDeleteDialog(false);

    try {
      const response = await fetch("/api/delete-collector", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, collectorId, token }),
      });

      const data = await response.json();
      debugLog('Delete response received', { success: data.success, message: data.message });

      if (data.success) {
        setSuccess(`Successfully deleted collector ${functionName}`);
        debugLog('Collector deleted successfully, updating local state');
        // Remove the deleted collector from the local state
        setInactiveCollectors(prev =>
          prev.map(user => ({
            ...user,
            collectors: user.collectors.filter(c => 
              !(c.customerId === customerId && c.collectorId === collectorId)
            )
          })).filter(user => user.collectors.length > 0)
        );
      } else {
        setError(data.error || "Failed to delete collector");
      }
    } catch (err) {
      setError("Network error while deleting collector");
      logMessage("error", "Delete error:", err);
    } finally {
      setDeletingCollectors(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteKey);
        return newSet;
      });
      setCollectorToDelete(null);
    }
  };

  const confirmBulkDeleteCollectors = async () => {
    if (!customerToDeleteAll || !token) return;

    const { customerId } = customerToDeleteAll;
    const customer = filteredCollectors.find(c => c.customerId === customerId);
    if (!customer) return;

    setShowBulkDeleteDialog(false);
    setError("");

    let successCount = 0;
    let errorCount = 0;

    for (const collector of customer.collectors) {
      if (!collector.collectorId) continue;

      const deleteKey = `${customerId}-${collector.collectorId}`;
      setDeletingCollectors(prev => new Set(prev).add(deleteKey));

      try {
        const response = await fetch("/api/delete-collector", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, collectorId: collector.collectorId, token }),
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        logMessage("error", "Bulk delete error:", err);
      } finally {
        setDeletingCollectors(prev => {
          const newSet = new Set(prev);
          newSet.delete(deleteKey);
          return newSet;
        });
      }
    }

    if (successCount > 0) {
      setSuccess(`Successfully deleted ${successCount} collectors for customer ${customerId}`);
      // Remove all deleted collectors from local state
      setInactiveCollectors(prev =>
        prev.map(user => user.customerId === customerId 
          ? { ...user, collectors: [] }
          : user
        ).filter(user => user.collectors.length > 0)
      );
    }

    if (errorCount > 0) {
      setError(`Failed to delete ${errorCount} collectors`);
    }

    setCustomerToDeleteAll(null);
  };

  // Get unique collector types for filter
  const allCollectorTypes = [
    'auth0', 'carbonblack', 'ciscoamp', 'ciscoduo','ciscomeraki',
    'crowdstrike', 'googlestackdriver', 'gsuite', 'mimecast',
    'o365', 'okta', 'sentinelone', 'salesforce', 'sophos', 
    'sophossiem', 'meraki', 'packages/lambda/al-s3-collector.zip'
  ].sort();

  // Get unique collector types that are actually found in inactive collectors
  const foundCollectorTypes = Array.from(
    new Set(
      inactiveCollectors.flatMap(user =>
        user.collectors.map(collector => collector.collectorName)
      )
    )
  ).sort();

  const totalCollectors = filteredCollectors.reduce((sum, user) => sum + user.collectors.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
               Inactive User Collectors Management
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Scan ALL Lambda functions in the selected region/profile to find collectors belonging to inactive users
            </p>
          </div>

          {/* Authentication Section */}
          {!isAuthenticated && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">🔐</span>
                </div>
                <h2 className="text-xl font-semibold text-blue-900">Authentication Required</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  type="text"
                  placeholder="Access Key"
                  value={accesskey}
                  onChange={(e) => setAccesskey(e.target.value)}
                  className="w-full"
                />
                <Input
                  type="password"
                  placeholder="Secret Key"
                  value={secretkey}
                  onChange={(e) => setSecretkey(e.target.value)}
                  className="w-full"
                />
                <Button
                  onClick={handleAuthentication}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Authenticating..." : "Authenticate"}
                </Button>
              </div>
            </div>
          )}

          {/* Debug Panel - Only show in development or when DEBUG is enabled */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') && isAuthenticated && (
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 mb-8 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-yellow-800 flex items-center">
                  🐛 Debug Logs
                </h3>
                <Button
                  onClick={() => {
                    clearLogMessages();
                    setDebugLogs([]);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1"
                >
                  Clear Logs
                </Button>
              </div>
              <div className="bg-black text-green-400 rounded p-4 font-mono text-xs max-h-40 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">No debug logs yet...</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Controls Section */}
          {isAuthenticated && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                ⚙️ Control Panel
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">AWS Profile</label>
                  <Select
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    className="w-full"
                  >
                    {PROFILE_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">AWS Region</label>
                  <Select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full"
                  >
                    {REGION_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <Button
                    onClick={fetchInactiveCollectors}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? "🔄 Fetching All Lambdas..." : "🚀 Fetch Collectors"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Search</label>
                  <Input
                    type="text"
                    placeholder="🔍 Search collectors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Filter by Type</label>
                  <Select
                    value={selectedCollectorType}
                    onChange={(e) => setSelectedCollectorType(e.target.value)}
                    className="w-full"
                  >
                    <option value="">🌐 All Collector Types</option>
                    {allCollectorTypes.map((type: string) => (
                      <option key={type} value={type}>
                        🔧 {type} {foundCollectorTypes.includes(type) ? `(found)` : `(not found)`}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Export</label>
                  <Button
                    onClick={exportToJson}
                    disabled={loading || filteredCollectors.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    title="Export current data to JSON file"
                  >
                    📁 Export
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Columns</label>
                  <Button
                    onClick={() => setShowColumnSettings(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    title="Configure visible columns"
                  >
                    ⚙️ Columns
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Logout</label>
                  <Button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    title="Logout and clear token"
                  >
                    🔓 Logout
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Statistics */}
          {isAuthenticated && inactiveCollectors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-blue-700">{inactiveUsers.length}</div>
                    <div className="text-sm font-medium text-blue-600">Inactive Users</div>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-orange-700">{filteredCollectors.length}</div>
                    <div className="text-sm font-medium text-orange-600">Users with Collectors</div>
                  </div>
                  <div className="text-3xl">📊</div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl border border-red-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-700">{totalCollectors}</div>
                    <div className="text-sm font-medium text-red-600">Total Collectors</div>
                  </div>
                  <div className="text-3xl">🔧</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collectors Table */}
        {isAuthenticated && filteredCollectors.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  📋 Inactive User Collectors
                </h2>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {totalCollectors} total collectors
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <TableHead className="bg-gray-50">🆔 Customer ID</TableHead>
                    <TableHead className="bg-gray-50">⚡ Function Name</TableHead>
                    <TableHead className="bg-gray-50">� Collector Name</TableHead>
                    <TableHead className="bg-gray-50">�🔧 Collector Type</TableHead>
                    <TableHead className="bg-gray-50">🏷️ Collector ID</TableHead>
                    <TableHead className="bg-gray-50">📚 Stack Name</TableHead>
                    <TableHead className="bg-gray-50">🖥️ Runtime</TableHead>
                    <TableHead className="bg-gray-50">💾 Memory (MB)</TableHead>
                    <TableHead className="bg-gray-50">⏰ Last Modified</TableHead>
                    <TableHead className="bg-gray-50">⚡ Actions</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollectors.map((user, userIndex) => (
                    <React.Fragment key={user.customerId}>
                      {/* Customer Header Row */}
                      <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-300">
                        <td colSpan={9} className="px-4 py-4 font-bold text-blue-900">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">👤</span>
                            <span>Customer: {user.customerId}</span>
                            <span className="ml-2 bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                              {user.collectors.length} collectors
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            onClick={() => handleDeleteAllForCustomer(user.customerId)}
                            disabled={loading || user.collectors.some(c => !c.collectorId)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-semibold"
                            title="Delete all collectors for this customer"
                          >
                            🗑️ Delete All
                          </Button>
                        </td>
                      </tr>
                      {/* Collector Rows */}
                      {user.collectors.map((collector, index) => {
                        const deleteKey = `${collector.customerId}-${collector.collectorId}`;
                        const isDeleting = deletingCollectors.has(deleteKey);
                        
                        return (
                          <TableRow key={`${user.customerId}-${index}`} className="bg-white hover:bg-gray-50 transition-colors">
                            <TableCell className="font-mono text-xs pl-8 text-gray-600">
                              {collector.customerId}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-gray-800">
                              {collector.functionName}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-700">
                              {collector.pawsTypeName || collector.collectorName || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                                🔧 {collector.collectorName}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-600">
                              {collector.collectorId || (
                                <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs">⚠️ N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-600">
                              {collector.stackName || (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                                {collector.runtime}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-gray-700">{collector.memorySize}</span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="text-gray-600">
                                {new Date(collector.lastModified).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleDeleteCollector(
                                  collector.customerId,
                                  collector.collectorId,
                                  collector.functionName
                                )}
                                disabled={isDeleting || !collector.collectorId || loading}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                title={!collector.collectorId ? "No collector ID available" : "Delete this collector"}
                              >
                                {isDeleting ? "🔄 Deleting..." : "🗑️ Delete"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAuthenticated && loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-blue-500">
              <div className="text-6xl mb-4 animate-bounce">🔄</div>
              <div className="text-xl font-bold mb-3 text-blue-700">Fetching ALL Lambda Functions...</div>
              <div className="text-blue-600 max-w-md mx-auto">
                Scanning the entire AWS region for inactive user collectors. This may take a moment...
              </div>
              <div className="mt-4">
                <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {isAuthenticated && filteredCollectors.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-500">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl font-bold mb-3 text-gray-700">No Inactive Collectors Found</div>
              <div className="text-gray-600 max-w-md mx-auto">
                {inactiveCollectors.length === 0 
                  ? "Click 'Fetch Collectors' to scan your AWS environment and load data"
                  : "Try adjusting your search filters or collector type selection to find specific collectors"
                }
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && collectorToDelete && (
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Confirm Deletion
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the collector <strong>{collectorToDelete.functionName}</strong> 
                  for customer <strong>{collectorToDelete.customerId}</strong>?
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setShowDeleteDialog(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDeleteCollector}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Dialog>
        )}

        {/* Bulk Delete Confirmation Dialog */}
        {showBulkDeleteDialog && customerToDeleteAll && (
          <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Confirm Bulk Deletion
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <strong>ALL {customerToDeleteAll.collectorsCount} collectors</strong> 
                  for customer <strong>{customerToDeleteAll.customerId}</strong>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setShowBulkDeleteDialog(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmBulkDeleteCollectors}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete All ({customerToDeleteAll.collectorsCount})
                  </Button>
                </div>
              </div>
            </div>
          </Dialog>
        )}

        {/* Column Settings Dialog */}
        <Dialog open={showColumnSettings} onOpenChange={setShowColumnSettings}>
          <DialogContent>
            <DialogTitle>Column Settings</DialogTitle>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={columnSettings.customerid}
                  onChange={() => handleColumnChange('customerid')}
                  className="rounded"
                />
                <span>Customer ID</span>
              </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.functionName}
                    onChange={() => handleColumnChange('functionName')}
                    className="rounded"
                  />
                  <span>Function Name</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.collectorName}
                    onChange={() => handleColumnChange('collectorName')}
                    className="rounded"
                  />
                  <span>Collector Name</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.collectorType}
                    onChange={() => handleColumnChange('collectorType')}
                    className="rounded"
                  />
                  <span>Collector Type</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.stackName}
                    onChange={() => handleColumnChange('stackName')}
                    className="rounded"
                  />
                  <span>Stack Name</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.lastModified}
                    onChange={() => handleColumnChange('lastModified')}
                    className="rounded"
                  />
                  <span>Last Modified</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.runtime}
                    onChange={() => handleColumnChange('runtime')}
                    className="rounded"
                  />
                  <span>Runtime</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.memorySize}
                    onChange={() => handleColumnChange('memorySize')}
                    className="rounded"
                  />
                  <span>Memory Size</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnSettings.description}
                    onChange={() => handleColumnChange('description')}
                    className="rounded"
                  />
                  <span>Description</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => setColumnSettings(defaultColumnSettings)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setShowColumnSettings(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Done
                </Button>
              </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}