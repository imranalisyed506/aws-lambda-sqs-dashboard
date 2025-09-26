// Centralized configuration and constants for AWS Lambda SQS Dashboard

export const DEFAULT_PROFILE = "playground";
export const DEFAULT_REGION = "us-east-1";
export const PROFILE_OPTIONS = ["playground", "paws_integration", "paws"];
export const REGION_OPTIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
export const IMPORTANT_KEYS = [
  "FunctionName",
  "Description",
  "Runtime",
  "MemorySize",
  "LastModified",
  "collectorType"
];
export const DEFAULT_COLUMNS = [
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
export const PAGE_SIZE = 50;
export const MAX_FRONTEND_MS = 300000; // 5 minutes
export const SQS_RETRY_ATTEMPTS = 3;
export const SQS_RETRY_DELAY = 4000; // ms
export const LAMBDA_RETRY_ATTEMPTS = 3;
export const LAMBDA_RETRY_DELAY = 4000; // ms
export const COLLECTOR_SUMMARY_RETRY_ATTEMPTS = 3;
export const COLLECTOR_SUMMARY_RETRY_DELAY = 4000; // ms
// ...add more config as needed
