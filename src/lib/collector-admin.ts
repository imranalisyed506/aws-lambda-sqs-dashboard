
// Default streams, can be overridden by argument
const defaultStreams = ["Alerts", "Incident"];
import {
  ListFunctionsCommand,
  GetFunctionConfigurationCommand,
  UpdateFunctionConfigurationCommand,
  ListEventSourceMappingsCommand,
  UpdateEventSourceMappingCommand,
} from "@aws-sdk/client-lambda";
import {
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  SendMessageBatchCommand,
} from "@aws-sdk/client-sqs";
import { getLambdaClient, getSqsClient } from "./aws-client";
import fs from "fs/promises";



// You must pass profile and region to get the correct client
// This function is deprecated; use getCollectors with profile/region instead.
// export async function* listAllFunctions(): AsyncGenerator<any, void, unknown> {
//   throw new Error("listAllFunctions now requires profile and region arguments");
// }


/**
 * Get collectors matching a type and description filter, and whose streams differ from the provided newStreams.
 * @param {string} type - The collector type (e.g., 'crowdstrike').
 * @param {string} profile - AWS profile (for cache file naming).
 * @param {string} region - AWS region (for cache file naming).
 * @param {string[]} [newStreams=defaultStreams] - Streams to compare against (order-insensitive).
 * @param {string} [descriptionFilter="Alert Logic Poll based collector"] - Description substring to match.
 * @returns {Promise<Array>} Collectors needing update.
 */
export async function getCollectors(
  type: string,
  profile: string,
  region: string,
  newStreams: string[] = defaultStreams,
  descriptionFilter: string = "Alert Logic Poll based collector"
): Promise<any[]> {
  const collectors: any[] = [];
  const lambdaClient = getLambdaClient(profile, region);
  async function* listAllFunctionsWithClient() {
    let Marker: string | undefined;
    do {
      const res: any = await lambdaClient.send(
        new ListFunctionsCommand({ Marker })
      );
      yield* res.Functions;
      Marker = res.NextMarker;
    } while (Marker);
  }
  for await (const fn of listAllFunctionsWithClient()) {
    const rawStreams = fn.Environment?.Variables?.collector_streams;
    let collectorStreams: string[] = [];
    if (rawStreams !== undefined && rawStreams !== null && rawStreams !== "") {
      if (Array.isArray(rawStreams)) {
        collectorStreams = rawStreams;
      } else if (typeof rawStreams === "string") {
        try {
          collectorStreams = JSON.parse(rawStreams);
        } catch (e) {
          // ignore
        }
      }
    }
    const isSame = Array.isArray(collectorStreams) &&
      collectorStreams.length === newStreams.length &&
      collectorStreams.every((val: string) => newStreams.includes(val)) &&
      newStreams.every((val: string) => collectorStreams.includes(val));
    if (
      (descriptionFilter ? fn.Description?.includes(descriptionFilter) : true) &&
      (type ? fn.Environment?.Variables?.paws_type_name === type : true) &&
      isSame === false
    ) {
      const config: any = await lambdaClient.send(
        new GetFunctionConfigurationCommand({ FunctionName: fn.FunctionName })
      );
      collectors.push({
        name: fn.FunctionName,
        description: config.Description,
        cid: config.Environment?.Variables?.customer_id,
        env: config.Environment?.Variables || {},
      });
    }
  }
  if (collectors.length > 0) {
    const fileName = `${type || 'all'}_collectors_${profile}_${region}.json`;
    await fs.writeFile(fileName, JSON.stringify(collectors, null, 2));
  }
  return collectors;
}


/**
 * Update collector_streams for a Lambda function.
 * @param {string} functionName
 * @param {object} envVar
 * @param {string[]} newStreams
 */
export async function updateCollectorStreams(
  functionName: string,
  envVar: Record<string, any>,
  newStreams: string[] = defaultStreams,
  profile?: string,
  region?: string
): Promise<void> {
  if (!profile || !region) throw new Error("updateCollectorStreams requires profile and region");
  const lambdaClient = getLambdaClient(profile, region);
  const newEnv = {
    ...envVar,
    collector_streams: JSON.stringify(newStreams),
  };
  await lambdaClient.send(
    new UpdateFunctionConfigurationCommand({
      FunctionName: functionName,
      Environment: { Variables: newEnv },
    })
  );
}

export async function getEventSourceMappings(fnName: string, profile: string, region: string): Promise<any[]> {
  const lambdaClient = getLambdaClient(profile, region);
  const res: any = await lambdaClient.send(
    new ListEventSourceMappingsCommand({ FunctionName: fnName })
  );
  return res.EventSourceMappings || [];
}

export async function disableSqsPolling(fnName: string, profile: string, region: string): Promise<void> {
  const lambdaClient = getLambdaClient(profile, region);
  const mappings = await getEventSourceMappings(fnName, profile, region);
  for (const mapping of mappings) {
    await lambdaClient.send(
      new UpdateEventSourceMappingCommand({
        UUID: mapping.UUID,
        Enabled: false,
      })
    );
  }
}

export async function enableSqsPolling(fnName: string, profile: string, region: string): Promise<void> {
  const lambdaClient = getLambdaClient(profile, region);
  const mappings = await getEventSourceMappings(fnName, profile, region);
  for (const mapping of mappings) {
    await lambdaClient.send(
      new UpdateEventSourceMappingCommand({
        UUID: mapping.UUID,
        Enabled: true,
      })
    );
  }
}

export async function dumpSqsMessages(
  queueUrl: string,
  collectorId: string,
  limit: number = 1000,
  profile?: string,
  region?: string
): Promise<any[]> {
  if (!profile || !region) throw new Error("dumpSqsMessages requires profile and region");
  const sqsClient = getSqsClient(profile, region);
  const messages: any[] = [];
  let received: any;
  let attempts = 0;
  const maxAttempts = 100; // safety to avoid infinite loops
  do {
    received = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2, // poll for up to 2 seconds
        VisibilityTimeout: 10,
      })
    );
    if (received.Messages && received.Messages.length > 0) {
      messages.push(...received.Messages);
    }
    attempts++;
    // Add a short delay between polls to allow SQS to make more messages visible
    if (received.Messages && received.Messages.length > 0 && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } while (received.Messages && received.Messages.length > 0 && messages.length < limit && attempts < maxAttempts);
  return messages;
}

export async function clearAndReplaceMessages(
  queueUrl: string,
  batch: any[],
  profile?: string,
  region?: string
): Promise<void> {
  if (!profile || !region) throw new Error("clearAndReplaceMessages requires profile and region");
  const sqsClient = getSqsClient(profile, region);
  let received: any;
  do {
    received = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 10,
      })
    );
    if (received.Messages) {
      const entries = received.Messages.map((m: any) => ({
        Id: m.MessageId,
        ReceiptHandle: m.ReceiptHandle,
      }));
      await sqsClient.send(
        new DeleteMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries })
      );
    }
  } while (received.Messages?.length > 0);
  // Add new messages from batch
  const batches: any[][] = [];
  for (let i = 0; i < batch.length; i += 10) {
    batches.push(batch.slice(i, i + 10));
  }
  for (const [i, b] of batches.entries()) {
    await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: b.map((msg: any, idx: number) => ({
          Id: `${i}-${idx}`,
          MessageBody: JSON.stringify(msg),
        })),
      })
    );
  }
}
