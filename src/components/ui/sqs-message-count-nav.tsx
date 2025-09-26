// Add a navigation link to the new SQS Message Count page in the main dashboard UI
// This will be a simple button at the top of the dashboard for easy access

import Link from "next/link";

export function SqsMessageCountNav() {
  return (
    <div className="w-full flex justify-end mb-2 pr-8">
      <Link href="/sqs-message-count">
        <button className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition">
          SQS Message Count
        </button>
      </Link>
    </div>
  );
}
