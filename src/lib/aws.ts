import { NextRequest, NextResponse } from "next/server";
import { listLambdas, getLambdaConfig, getLambdaEventSourceMappings, getSqsQueueDetails, toggleEventSourceMapping, updateLambdaEnvVars } from "./aws-client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile = searchParams.get("profile") || "playground";
  const region = searchParams.get("region") || "us-east-1";
  const functionName = searchParams.get("functionName");

  if (functionName) {
    const config = await getLambdaConfig(profile, region, functionName);
    const mappings = await getLambdaEventSourceMappings(profile, region, functionName);
    const queues = [];

    for (const m of mappings) {
      if (m.EventSourceArn && m.EventSourceArn.includes(":sqs:")) {
        try {
          const q = await getSqsQueueDetails(profile, region, m.EventSourceArn);
          queues.push({ ...q, uuid: m.UUID, state: m.State, enabled: m.State === "Enabled" });
        } catch (e) {
          console.error("Failed to fetch queue details", e);
        }
      }
    }

    return NextResponse.json({ config, queues });
  }

  const lambdas = await listLambdas(profile, region);
  return NextResponse.json(lambdas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile, region, uuid, enable, functionName, envVars } = body;
  try {
    if (uuid) {
      const updated = await toggleEventSourceMapping(profile, region, uuid, enable);
      return NextResponse.json(updated);
    }
    if (functionName && envVars) {
      const updated = await updateLambdaEnvVars(profile, region, functionName, envVars);
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}