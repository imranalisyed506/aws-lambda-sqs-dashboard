import { NextRequest, NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import { listLambdasBatch, listSqsQueues, getLambdaConfig, getLambdaEventSourceMappings, getSqsQueueDetails, toggleEventSourceMapping, updateLambdaEnvVars, getLambdaCloudWatchLogs, invokeLambdaSelfUpdate } from "@/lib/aws-client";
import { LambdaClient, paginateListFunctions } from "@aws-sdk/client-lambda";
import { logMessage } from "@/lib/utils";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const profile = searchParams.get("profile") || "default";
  const region = searchParams.get("region") || "us-east-1";
  const functionName = searchParams.get("functionName");
  const logs = searchParams.get("logs");

  if (functionName && logs === "1") {
    // Fetch CloudWatch logs for this Lambda function
    try {
      logMessage("info", "API: Fetching CloudWatch logs for", functionName, profile, region);
      const logEvents = await getLambdaCloudWatchLogs(profile, region, functionName);
      logMessage("debug", "API: CloudWatch logs result", logEvents);
      return NextResponse.json({ logs: logEvents });
    } catch (err: any) {
      logMessage("error", "API: Error fetching CloudWatch logs", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (functionName) {
  logMessage("info", "API: Fetching Lambda config and event source mappings for", functionName, profile, region);
    const config = await getLambdaConfig(profile, region, functionName);
    const mappings = await getLambdaEventSourceMappings(profile, region, functionName);
    const queues = [];

    for (const m of mappings) {
      if (m.EventSourceArn && m.EventSourceArn.includes(":sqs:")) {
        try {
          const q = await getSqsQueueDetails(profile, region, m.EventSourceArn);
          queues.push({ ...q, uuid: m.UUID, state: m.State, enabled: m.State === "Enabled" });
        } catch (e) {
          logMessage("error", "API: Failed to fetch queue details", e);
        }
      }
    }

  logMessage("debug", "API: Lambda config", config);
  logMessage("debug", "API: Lambda queues", queues);
    return NextResponse.json({ config, queues });
  }

  const credentials = fromIni({ profile });
  // Fetch all Lambdas and SQS queues in parallel (no pagination)
  logMessage("info", "API: Fetching ALL Lambdas and SQS queues", { region, profile });
  const [lambdasRaw, sqsQueues] = await Promise.all([
    (async () => {
      const client = new LambdaClient({ region, credentials });
      const lambdas: any[] = [];
      const paginator = paginateListFunctions({ client }, {});
      for await (const awsPage of paginator) {
        if (awsPage.Functions) lambdas.push(...awsPage.Functions);
      }
      return lambdas;
    })(),
    listSqsQueues(region, credentials)
  ]);
  // Fetch config for all Lambdas
  logMessage("debug", "API: Lambdas batch", lambdasRaw);
  const configs = await Promise.all(
  lambdasRaw.map(fn => getLambdaConfig(profile, region, fn.FunctionName).catch((e) => { logMessage("error", "API: Failed to fetch config for", fn.FunctionName, e); return null; }))
  );
  const lambdas = lambdasRaw.map((fn, idx) => {
    let collectorType = "-";
    if (fn.Description === "Alert Logic S3 collector") {
      collectorType = "s3-collector";
    } else if (configs[idx]) {
      collectorType = configs[idx]?.Environment?.Variables?.paws_type_name || "-";
    }
    logMessage("debug", "API: Lambda", fn.FunctionName, "collectorType", collectorType);
    return { ...fn, collectorType };
  });
  return NextResponse.json({ lambdas, sqsQueues });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
    let { profile, region, uuid, enable, functionName, envVars, selfUpdate } = body;
    profile = profile || "default";
    region = region || "us-east-1";
    try {
      if (uuid) {
        const updated = await toggleEventSourceMapping(profile, region, uuid, enable);
        return NextResponse.json(updated);
      }
      // SelfUpdate: only if selfUpdate is true and functionName is present
      if (selfUpdate === true && functionName) {
        const result = await invokeLambdaSelfUpdate(profile, region, functionName);
        return NextResponse.json({ status: "SelfUpdate triggered", result });
      }
      // Environment variable update: only if envVars is present and valid
      if (envVars && typeof envVars === "object" && functionName) {
        const updated = await updateLambdaEnvVars(profile, region, functionName, envVars);
        return NextResponse.json(updated);
      }
      // If neither, return error
      return NextResponse.json({ error: "Invalid request. Must provide either selfUpdate or envVars with functionName." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
