import Link from "next/link";

export function MainNav() {
  return (
    <nav className="w-full flex flex-row gap-4 justify-center items-center py-4 bg-black mb-2">
      <Link href="/" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">Home</Link>
      <Link href="/zip-update" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">Zip Update</Link>
      <Link href="/inactive-collectors" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">Inactive Collectors</Link>
      <Link href="/error-collectors" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">Error Collectors</Link>
      <Link href="/sqs-message-count" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">SQS Message Count</Link>
  <Link href="/collector-admin" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">Collector Admin</Link>
  <Link href="/sqs-message-reader" className="px-4 py-2 rounded font-semibold text-white hover:bg-stone-900 transition">SQS Message Reader</Link>
    </nav>
  );
}
