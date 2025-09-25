import { NextRequest, NextResponse } from "next/server";
import { listLambdasBatch } from "@/lib/aws-client";
import { fromIni } from "@aws-sdk/credential-providers";

// Returns a summary of collector types and their counts for a given profile/region
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile = searchParams.get("profile") || "default";
  const region = searchParams.get("region") || "us-east-1";
  const credentials = fromIni({ profile });
  const lambdas = await listLambdasBatch(region, credentials, 0, 1000); // fetch up to 1000
  // For each lambda, get collectorType from env vars or Description
  const collectorCounts: Record<string, number> = {};
  for (const fn of lambdas) {
    let type = "-";
    if (fn.Description === "Alert Logic S3 collector") {
      type = "s3-collector";
    } else {
      type = fn.Environment?.Variables?.paws_type_name || "-";
    }
    collectorCounts[type] = (collectorCounts[type] || 0) + 1;
  }
  return NextResponse.json({ collectorCounts });
}
