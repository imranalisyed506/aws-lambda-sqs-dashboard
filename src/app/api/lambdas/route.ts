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
    logMessage("info", "API: Fetching CloudWatch logs for", functionName, profile, region);
    const logEvents = await getLambdaCloudWatchLogs(profile, region, functionName);
    logMessage("debug", "API: CloudWatch logs result", logEvents);
    return NextResponse.json({ logs: logEvents });
  }

  if (functionName) {
    logMessage("info", "API: Fetching Lambda config and event source mappings for", functionName, profile, region);
    const config = await getLambdaConfig(profile, region, functionName);
    const mappingsRaw = await getLambdaEventSourceMappings(profile, region, functionName);
    // Normalize mapping properties for frontend (AWS SDK v3 uses capitalized names)
    const eventSourceMappings = (mappingsRaw || []).map(m => ({
      UUID: m.UUID,
      State: m.State,
      Enabled: m.State === 'Enabled',
      EventSourceArn: m.EventSourceArn,
    }));
    logMessage("debug", "API: Lambda config", config);
    logMessage("debug", "API: Lambda event source mappings", eventSourceMappings);
    return NextResponse.json({ config, eventSourceMappings });
  }

  const credentials = fromIni({ profile });
  // Fetch all Lambdas and SQS queues in parallel (no pagination)
  logMessage("info", "API: Fetching ALL Lambdas and SQS queues", { region, profile });
  let lambdasRaw = [];
  let sqsQueues = [];
  try {
    [lambdasRaw, sqsQueues] = await Promise.all([
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
  } catch (err: any) {
    if (err?.name === 'TooManyRequestsException' || err?.Reason === 'CallerRateLimitExceeded') {
      return NextResponse.json({ error: 'AWS rate limit exceeded. Please try again later.' }, { status: 429 });
    }
    return NextResponse.json({ error: err?.message || 'Failed to fetch Lambdas.' }, { status: 500 });
  }
  
  // Filter to only include Alert Logic collectors
  const alertLogicCollectors = lambdasRaw.filter(fn => {
    const description = fn.Description || "";
    return description === "Alert Logic S3 collector" || 
           description === "Alert Logic Poll based collector";
  });
  
  // Fetch config for Alert Logic Lambdas only
  logMessage("debug", "API: Alert Logic collectors found", alertLogicCollectors.length);
  const configs = await Promise.all(
  alertLogicCollectors.map(fn => getLambdaConfig(profile, region, fn.FunctionName).catch((e) => { logMessage("error", "API: Failed to fetch config for", fn.FunctionName, e); return null; }))
  );
  const lambdas = alertLogicCollectors.map((fn, idx) => {
    let collectorType = "-";
    if (fn.Description === "Alert Logic S3 collector") {
      collectorType = "s3-collector";
    } else if ("Alert Logic Poll based collector" === fn.Description) {
      console.log("Debug: Poll based collector found", JSON.stringify(fn?.Environment?.Variables?.paws_type_name));
      collectorType = fn?.Environment?.Variables?.paws_type_name || "-";
    }
    
    // Extract customer ID from environment variables
    const environment = fn.Environment?.Variables || {};
    const customerId = environment.customer_id || environment.customerId || environment.CUSTOMER_ID || 'unknown';
    
    logMessage("debug", "API: Lambda", fn.FunctionName, "collectorType", collectorType, "customerId", customerId);
    return { ...fn, collectorType, customerId };
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
