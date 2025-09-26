import { logMessage } from "@/lib/utils";
import { SQSClient, GetQueueAttributesCommand, ListQueuesCommand, paginateListQueues } from "@aws-sdk/client-sqs";
import { fromIni } from "@aws-sdk/credential-providers";
import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionConfigurationCommand,
  ListEventSourceMappingsCommand,
  UpdateEventSourceMappingCommand,
  UpdateFunctionConfigurationCommand,
  paginateListFunctions,
  InvokeCommand
} from "@aws-sdk/client-lambda";
const lambdaClientCache: Record<string, LambdaClient> = {};
export function getLambdaClient(profile: string, region: string) {
  const cacheKey = `${profile}:${region}`;
  if (!lambdaClientCache[cacheKey]) {
    lambdaClientCache[cacheKey] = new LambdaClient({
      region,
      credentials: fromIni({ profile }),
      // Performance optimizations
      requestHandler: {
        connectionTimeout: 3000,
        socketTimeout: 30000,
      },
      maxAttempts: 2,
    });
  }
  return lambdaClientCache[cacheKey];
}

// Invoke Lambda with SelfUpdate test event
export async function invokeLambdaSelfUpdate(profile: string, region: string, functionName: string) {
  const client = getLambdaClient(profile, region);
  const payload = {
    RequestType: "ScheduledEvent",
    Type: "SelfUpdate"
  };
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
    InvocationType: "Event" // async invocation
  });
  const result = await client.send(command);
  return result;
}

import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

// Cached CloudWatch Logs client
const cloudwatchClientCache: Record<string, CloudWatchLogsClient> = {};
export function getCloudWatchLogsClient(profile: string, region: string) {
  logMessage("debug", "Getting CloudWatchLogsClient for", profile, region);
  const cacheKey = `${profile}:${region}`;
  if (!cloudwatchClientCache[cacheKey]) {
    cloudwatchClientCache[cacheKey] = new CloudWatchLogsClient({
      region,
      credentials: fromIni({ profile }),
      // Performance optimizations
      requestHandler: {
        connectionTimeout: 3000,
        socketTimeout: 60000, // Longer timeout for logs
      },
      maxAttempts: 2,
    });
  }
  return cloudwatchClientCache[cacheKey];
}

// Get CloudWatch logs for a Lambda function for the last 1 hour
export async function getLambdaCloudWatchLogs(profile: string, region: string, functionName: string) {
  logMessage("debug", "Fetching CloudWatch logs for Lambda:", functionName, "profile:", profile, "region:", region);
  const client = getCloudWatchLogsClient(profile, region);
  const logGroupName = `/aws/lambda/${functionName}`;
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const params = {
    logGroupName,
    startTime: oneHourAgo,
    endTime: now,
    limit: 100,
  };
  const command = new FilterLogEventsCommand(params);
  const result = await client.send(command);
  logMessage("debug", "CloudWatch logs result:", result);
  // Sort logs by timestamp descending (recent first)
  const sortedEvents = (result.events || []).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  return sortedEvents;
}

// Cached SQS client with optimized configuration
const sqsClientCache: Record<string, SQSClient> = {};
export function getSqsClient(profile: string, region: string) {
  const cacheKey = `${profile}:${region}`;
  if (!sqsClientCache[cacheKey]) {
    sqsClientCache[cacheKey] = new SQSClient({
      region,
      credentials: fromIni({ profile }),
      // AWS SDK v3 Performance Optimizations
      requestHandler: {
        connectionTimeout: 3000,        // 3 second connection timeout
        socketTimeout: 30000,           // 30 second socket timeout
      },
      maxAttempts: 2,                   // Reduce retry attempts for faster failure
    });
  }
  return sqsClientCache[cacheKey];
}

export async function listLambdas(profile: string, region: string) {
  const client = getLambdaClient(profile, region);
  const result = await client.send(new ListFunctionsCommand({}));
  return result.Functions || [];
}

// Paginated Lambda fetch: returns batch of Lambdas for given page
export async function listLambdasBatch(region: string, credentials: any, page: number, pageSize: number = 50) {
  const client = new LambdaClient({ region, credentials });
  const lambdas: any[] = [];
  let done = false;
  const paginator = paginateListFunctions({ client }, {});
  for await (const awsPage of paginator) {
    if (awsPage.Functions) {
      lambdas.push(...awsPage.Functions);
      if (lambdas.length >= (page + 1) * pageSize) {
        done = true;
      }
    }
    if (done) break;
  }
  return lambdas.slice(page * pageSize, (page + 1) * pageSize);
}

export async function getLambdaConfig(profile: string, region: string, functionName: string) {
  const client = getLambdaClient(profile, region);
  const result = await client.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }));
  return result;
}

export async function getLambdaEventSourceMappings(profile: string, region: string, functionName: string) {
  const client = getLambdaClient(profile, region);
  const result = await client.send(new ListEventSourceMappingsCommand({ FunctionName: functionName }));
  return result.EventSourceMappings || [];
}

export async function getSqsQueueDetails(profile: string, region: string, eventSourceArn: string) {
  const client = getSqsClient(profile, region);
  const arnParts = eventSourceArn.split(":");
  const queueName = arnParts[arnParts.length - 1];
  const accountId = arnParts[4];
  const queueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
  const result = await client.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["All"] }));
  return { url: queueUrl, attributes: result.Attributes };
}

// Fast queue status check for optimizing polling strategy
export async function getSqsQueueStatus(profile: string, region: string, queueUrl: string) {
  const client = getSqsClient(profile, region);
  try {
    const result = await client.send(new GetQueueAttributesCommand({ 
      QueueUrl: queueUrl, 
      AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"] 
    }));
    
    const visibleMessages = parseInt(result.Attributes?.ApproximateNumberOfMessages || "0");
    const inFlightMessages = parseInt(result.Attributes?.ApproximateNumberOfMessagesNotVisible || "0");
    
    return {
      hasMessages: visibleMessages > 0,
      visibleMessages,
      inFlightMessages,
      totalMessages: visibleMessages + inFlightMessages
    };
  } catch (error) {
    return { hasMessages: false, visibleMessages: 0, inFlightMessages: 0, totalMessages: 0 };
  }
}

export async function toggleEventSourceMapping(profile: string, region: string, uuid: string, enable: boolean) {
  const client = getLambdaClient(profile, region);
  const result = await client.send(new UpdateEventSourceMappingCommand({ UUID: uuid, Enabled: enable }));
  return result;
}

export async function updateLambdaEnvVars(profile: string, region: string, functionName: string, envVars: Record<string, string>) {
  const client = getLambdaClient(profile, region);
  const result = await client.send(new UpdateFunctionConfigurationCommand({ FunctionName: functionName, Environment: { Variables: envVars } }));
  return result;
}

export async function listSqsQueues(region: string, credentials?: any) {
  const client = new SQSClient({ region, credentials });
  const queues: string[] = [];
  const paginator = paginateListQueues({ client }, {});
  for await (const page of paginator) {
    if (page.QueueUrls) queues.push(...page.QueueUrls);
  }
  return queues;
}


