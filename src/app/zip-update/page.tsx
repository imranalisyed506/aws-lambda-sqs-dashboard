"use client";
import React, { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";

import { PROFILE_OPTIONS } from "../config";

export default function ZipUpdatePage() {
  const [zipFiles, setZipFiles] = useState<string[]>([]);
  const [lambdaFunctions, setLambdaFunctions] = useState<any[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [selectedZip, setSelectedZip] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success"|"error">("success");
  const [loading, setLoading] = useState(false);
  const [profileS3, setProfileS3] = useState(PROFILE_OPTIONS[0]);
  const [profileLambda, setProfileLambda] = useState(PROFILE_OPTIONS[1] || PROFILE_OPTIONS[0]);
  const profiles = PROFILE_OPTIONS;

  async function fetchZipFiles() {
    setLoading(true);
    setStatus("");
    setShowAlert(false);
    setDebugLogs(logs => [...logs, `Fetching zip files (profile: ${profileS3})...`]);
    try {
      const res = await fetch(`/api/zip-update?type=zipfiles&profileS3=${profileS3}`);
      const data = await res.json();
      setZipFiles(data.zipFiles || []);
      setDebugLogs(logs => [...logs, `Zip files fetched: ${JSON.stringify(data.zipFiles)}`]);
      setStatus("Zip files fetched successfully");
      setAlertType("success");
      setShowAlert(true);
    } catch (err: any) {
      setStatus("Failed to fetch zip files");
      setAlertType("error");
      setShowAlert(true);
      setDebugLogs(logs => [...logs, `Error fetching zip files: ${err}`]);
    }
    setLoading(false);
  }

  async function fetchLambdaFunctions() {
    setLoading(true);
    setStatus("");
    setShowAlert(false);
    setDebugLogs(logs => [...logs, `Fetching Lambda functions (profile: ${profileLambda})...`]);
    try {
      const res = await fetch(`/api/zip-update?type=lambdas&profileLambda=${profileLambda}`);
      const data = await res.json();
      setLambdaFunctions(data.functions || []);
      setDebugLogs(logs => [...logs, `Lambda functions fetched: ${JSON.stringify(data.functions)}`]);
      setStatus("Lambda functions fetched successfully");
      setAlertType("success");
      setShowAlert(true);
    } catch (err: any) {
      setStatus("Failed to fetch Lambda functions");
      setAlertType("error");
      setShowAlert(true);
      setDebugLogs(logs => [...logs, `Error fetching Lambda functions: ${err}`]);
    }
    setLoading(false);
  }

  async function updateFunction(functionName: string, zipFile: string) {
    if (!functionName || !zipFile) return;
    setLoading(true);
    setStatus("");
    setShowAlert(false);
    setDebugLogs(logs => [...logs, `Updating Lambda: ${functionName} with zip: ${zipFile} (profile: ${profileLambda})`]);
    try {
      const res = await fetch("/api/zip-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ functionName, zipFile, profileLambda })
      });
      const data = await res.json();
      setStatus(data.status || "Update complete");
      setAlertType("success");
      setShowAlert(true);
      setDebugLogs(logs => [...logs, `Update result: ${JSON.stringify(data)}`]);
    } catch (err: any) {
      setStatus("Failed to update Lambda function");
      setAlertType("error");
      setShowAlert(true);
      setDebugLogs(logs => [...logs, `Error updating Lambda: ${err}`]);
    }
    setLoading(false);
  }

  return (
  <div className="min-h-screen flex flex-col items-center justify-start py-8 bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200">
      {showAlert && (
        <div className="mb-4 relative">
          <Alert variant={alertType}>{status}</Alert>
        </div>
      )}
      <div className="w-full max-w-2xl mb-8 px-6 py-6 rounded-2xl shadow-lg bg-white flex flex-col items-center">
        <h1 className="text-4xl font-extrabold mb-2 text-center text-indigo-700 tracking-tight drop-shadow">Zip Update</h1>
        <p className="text-stone-500 text-center mb-2">Manage AWS Lambda zip deployments with profile selection and instant updates.</p>
      </div>
  <div className="mb-6 flex flex-row items-end justify-center w-full max-w-3xl gap-6 px-4 py-4 rounded-xl shadow bg-white">
  <div className="flex flex-col gap-2 min-w-[160px]">
          <label className="text-xs font-semibold mb-1 text-stone-700">S3 Profile</label>
          <Select value={profileS3} onChange={e => setProfileS3(e.target.value)} uiSize="sm">
            {profiles.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
  <div className="flex flex-col gap-2 min-w-[160px]">
          <label className="text-xs font-semibold mb-1 text-stone-700">Lambda Profile</label>
          <Select value={profileLambda} onChange={e => setProfileLambda(e.target.value)} uiSize="sm">
            {profiles.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
  <Button onClick={fetchZipFiles} disabled={loading} className="w-40 shadow">Fetch Zip Files</Button>
  <Button onClick={fetchLambdaFunctions} disabled={loading} className="w-40 shadow">Fetch Lambdas</Button>
      </div>
      {/* Debug logs section moved here for visibility */}
      {/* ...existing code... */}
  {/* Loader overlay for consistency with home page */}
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
  <div className="mb-4 w-full flex flex-col items-center rounded-xl shadow bg-white px-4 py-4">
          <Table>
            <thead>
              <TableRow>
                <TableHead className="text-indigo-700">Lambda Function</TableHead>
                <TableHead className="text-indigo-700">aws_lambda_zipfile_name</TableHead>
                <TableHead className="text-indigo-700">Zip File Match</TableHead>
                <TableHead className="text-indigo-700">Action</TableHead>
                <TableHead className="text-indigo-700">Description</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {!loading && lambdaFunctions.map(fn => {
                const matchZip = zipFiles.includes(fn.zipfileName);
                return (
                  <TableRow key={fn.functionName}>
                    <TableCell className="font-semibold text-stone-700">{fn.functionName}</TableCell>
                    <TableCell>{fn.zipfileName || <span className="text-stone-400 italic">(none)</span>}</TableCell>
                    <TableCell>
                      {fn.zipfileName ? (
                        matchZip ? <span className="text-green-600 font-semibold">Match</span> : <span className="text-red-600 font-semibold">Missing</span>
                      ) : <span className="text-stone-400">N/A</span>}
                    </TableCell>
                    <TableCell>
                      {fn.zipfileName && matchZip ? (
                        <Button
                          size="sm"
                          disabled={loading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                          onClick={async () => {
                            await updateFunction(fn.functionName, fn.zipfileName);
                          }}
                        >Update</Button>
                      ) : <span className="text-stone-400">-</span>}
                    </TableCell>
                    <TableCell className="text-stone-500 italic">{fn.description}</TableCell>
                  </TableRow>
                );
              })}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {/* Loader row for table */}
                    <span className="animate-pulse text-stone-400">Loading...</span>
                  </TableCell>
                </TableRow>
              )}
            </tbody>
          </Table>
        </div>
      </div>
      <div className="mb-6 w-full max-w-xl flex flex-col items-center rounded-xl shadow bg-white px-4 py-4">
        <h2 className="font-semibold mb-2 text-center text-indigo-700">Debug Logs</h2>
        <pre className="bg-stone-100 p-2 rounded text-xs max-h-40 overflow-auto w-full text-left">{debugLogs.join("\n")}</pre>
      </div>
      <div className="mb-4 w-full max-w-xl flex flex-col items-center rounded-xl shadow bg-white px-4 py-4">
        <h2 className="font-semibold mb-2 text-center text-indigo-700">Available Zip Files</h2>
        <ul className="list-disc pl-6 text-xs w-full text-left">
          {zipFiles.map(zip => (
            <li key={zip} className="text-stone-700">{zip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
                                 