import { NextRequest, NextResponse } from "next/server";
import { getSqsQueueStatus } from "@/lib/aws-client";
import { fromIni } from "@aws-sdk/credential-providers";

export async function POST(req: NextRequest) {
  try {
    const { profile, region, queueUrl } = await req.json();
    if (!profile || !region || !queueUrl) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }
    const status = await getSqsQueueStatus(profile, region, queueUrl);
    return NextResponse.json({ sqsMessageCount: status.totalMessages });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to get SQS message count." }, { status: 500 });
  }
}
