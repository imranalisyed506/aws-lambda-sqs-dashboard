import { NextRequest, NextResponse } from "next/server";
import {
  getCollectors,
  updateCollectorStreams,
  disableSqsPolling,
  enableSqsPolling,
  dumpSqsMessages,
  clearAndReplaceMessages,
  getEventSourceMappings,
} from "@/lib/collector-admin";
import { getSqsClient } from "@/lib/aws-client";
import { GetQueueAttributesCommand } from "@aws-sdk/client-sqs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      collectorType,
      profile,
      region,
      action,
      batch,
      descriptionFilter
    } = body;
    // Step 1: Get collectors (generic)
    const collectors = await getCollectors(
      collectorType,
      profile,
      region,
      ["Alerts", "Incident"], // Default streams
      descriptionFilter
    );
    const results = [];
    for (const collector of collectors) {
      const { name, env } = collector;
      const queueUrl = env.paws_state_queue_url;
      const collectorId = env.collector_id;
      const customerId = env.customer_id;
      
      // Get current SQS status
      const eventSourceMappings = await getEventSourceMappings(name, profile, region);
      const sqsEnabled = eventSourceMappings.length > 0 && eventSourceMappings.some(mapping => mapping.State === 'Enabled');
      
      // Get comprehensive SQS attributes
      let sqsAttributes: any = {};
      if (queueUrl) {
        try {
          const sqsClient = getSqsClient(profile, region);
          const attributesResult = await sqsClient.send(new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: ["All"]
          }));
          sqsAttributes = attributesResult.Attributes || {};
        } catch (error) {
          console.error(`Failed to get SQS attributes for ${queueUrl}:`, error);
        }
      }
      
      if (action === "update_streams") {
        await updateCollectorStreams(name, env, ["Alerts", "Incident"], profile, region);
        results.push({ name, status: "streams_updated", count: null, queueUrl, collectorId, customerId, sqsEnabled, sqsAttributes });
      }
      if (action === "disable_sqs") {
        await disableSqsPolling(name, profile, region);
        results.push({ name, status: "sqs_disabled", count: null, queueUrl, collectorId, customerId, sqsEnabled: false, sqsAttributes });
      }
      if (action === "enable_sqs") {
        await enableSqsPolling(name, profile, region);
        results.push({ name, status: "sqs_enabled", count: null, queueUrl, collectorId, customerId, sqsEnabled: true, sqsAttributes });
      }
      if (action === "dump_sqs") {
        const messages = await dumpSqsMessages(queueUrl, collectorId, 100, profile, region);
        results.push({ name, status: "sqs_dumped", count: messages.length, queueUrl, collectorId, customerId, sqsEnabled, sqsAttributes });
      }
      if (action === "replace_sqs" && batch) {
        await clearAndReplaceMessages(queueUrl, batch, profile, region);
        results.push({ name, status: "sqs_replaced", count: batch.length, queueUrl, collectorId, customerId, sqsEnabled, sqsAttributes });
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("Collector admin API error:", err);
    const errorMessage = err?.message || err?.name || String(err);
    const awsErrorCode = err?.Code || err?.$metadata?.httpStatusCode;
    const detailedError = awsErrorCode ? `AWS Error (${awsErrorCode}): ${errorMessage}` : `Error: ${errorMessage}`;
    return NextResponse.json({ ok: false, error: detailedError }, { status: 500 });
  }
}
