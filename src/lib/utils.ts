// Utility to format relative time
export function formatRelativeTime(dateString: string) {
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
// Simple logger utility for backend and UI
let logBuffer: string[] = [];

export function logMessage(level: "debug"|"info"|"error", ...args: any[]) {
  const msg = `[${new Date().toISOString()}] [${level.toUpperCase()}] ` + args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  logBuffer.push(msg);
  
  // Output to console in development or when DEBUG is enabled
  // if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
  if (process.env.DEBUG === 'true') {
    console.log(msg);
  }
}

export function getLogMessages() {
  // Return all logs from buffer
  return [...logBuffer];
}

export function clearLogMessages() {
  logBuffer = [];
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
