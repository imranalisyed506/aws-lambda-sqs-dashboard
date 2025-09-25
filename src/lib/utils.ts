// Simple logger utility for backend and UI
let logBuffer: string[] = [];

export function logMessage(level: "debug"|"info"|"error", ...args: any[]) {
  const msg = `[${new Date().toISOString()}] [${level.toUpperCase()}] ` + args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  logBuffer.push(msg);
  // Only in-memory logging for Next.js compatibility
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
