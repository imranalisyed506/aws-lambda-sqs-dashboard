import { NextResponse } from "next/server";
import { getLogMessages } from "@/lib/utils";

export async function GET() {
  // Return all log messages for UI
  const logs = getLogMessages();
  return NextResponse.json({ logs });
}
