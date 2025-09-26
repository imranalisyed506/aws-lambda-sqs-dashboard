import { NextRequest, NextResponse } from "next/server";
import { toggleEventSourceMapping } from "@/lib/aws-client";

export async function POST(req: NextRequest) {
  try {
    const { profile, region, uuid, enable } = await req.json();
    if (!profile || !region || !uuid || typeof enable !== "boolean") {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }
    try {
      const toggleResult = await toggleEventSourceMapping(profile, region, uuid, enable);
      return NextResponse.json(toggleResult);
    } catch (err: any) {
      console.error("/api/sqs-toggle AWS error:", err);
      if (err?.name === "ResourceInUseException" || (err?.message && err.message.includes("ResourceInUseException"))) {
        return NextResponse.json({ error: "ResourceInUseException: The event source mapping is currently being updated by AWS. Please wait a few seconds and try again." }, { status: 409 });
      }
      return NextResponse.json({
        error: err?.message || "Failed to toggle SQS mapping.",
        details: err,
        stack: err?.stack
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to toggle SQS mapping." }, { status: 500 });
  }
}
