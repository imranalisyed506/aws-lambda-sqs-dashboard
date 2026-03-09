---
name: aws-services
description: "AWS SDK v3 expertise for Lambda, SQS, DynamoDB, CloudWatch, and S3 operations with performance optimizations and best practices"
applyTo: "src/lib/**,src/app/api/**"
---

# AWS Services Skill

## Overview

Expert knowledge for working with AWS SDK v3 in the AWS Lambda SQS Dashboard project. This skill covers Lambda, SQS, DynamoDB, CloudWatch Logs, and S3 operations with performance optimizations.

## AWS SDK v3 Client Management

### Cached Client Pattern

**Always use cached clients** from `src/lib/aws-client.ts`:

```typescript
import { 
  getCachedLambdaClient,
  getCachedSQSClient,
  getCachedCloudWatchLogsClient,
  getCachedS3Client
} from '@/lib/aws-client';

// Usage in API routes
const lambdaClient = getCachedLambdaClient(profile, region);
const sqsClient = getCachedSQSClient(profile, region);
```

### Client Configuration Standards

**Connection Settings:**
```typescript
{
  requestHandler: {
    connectionTimeout: 3000,    // 3s for Lambda, SQS, S3
    socketTimeout: 30000,       // 30s for Lambda, SQS, S3
  },
  maxAttempts: 2,               // Reduce retry attempts
}
```

**CloudWatch Specific:**
```typescript
{
  requestHandler: {
    connectionTimeout: 5000,    // 5s for CloudWatch
    socketTimeout: 60000,       // 60s for CloudWatch (longer logs)
  },
  maxAttempts: 2,
}
```

## Lambda Operations

### List Lambda Functions

```typescript
import { ListFunctionsCommand, GetFunctionCommand } from "@aws-sdk/client-lambda";

// Efficient listing with pagination
async function listLambdas(profile: string, region: string) {
  const client = getCachedLambdaClient(profile, region);
  
  let functions = [];
  let marker: string | undefined;
  
  do {
    const command = new ListFunctionsCommand({
      Marker: marker,
      MaxItems: 50, // Pagination
    });
    
    const response = await client.send(command);
    functions.push(...(response.Functions || []));
    marker = response.NextMarker;
  } while (marker);
  
  return functions;
}
```

### Get Function Details

```typescript
import { GetFunctionCommand, GetFunctionConfigurationCommand } from "@aws-sdk/client-lambda";

// Get function configuration (faster than GetFunction)
async function getFunctionConfig(functionName: string, profile: string, region: string) {
  const client = getCachedLambdaClient(profile, region);
  const command = new GetFunctionConfigurationCommand({
    FunctionName: functionName,
  });
  
  return await client.send(command);
}
```

### Update Function Code

```typescript
import { UpdateFunctionCodeCommand, waitUntilFunctionUpdatedV2 } from "@aws-sdk/client-lambda";

async function updateFunctionCode(
  functionName: string,
  s3Bucket: string,
  s3Key: string,
  profile: string,
  region: string
) {
  const client = getCachedLambdaClient(profile, region);
  
  // Update code
  const updateCommand = new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    S3Bucket: s3Bucket,
    S3Key: s3Key,
  });
  
  await client.send(updateCommand);
  
  // Wait for update to complete
  await waitUntilFunctionUpdatedV2(
    { client, maxWaitTime: 300 },
    { FunctionName: functionName }
  );
}
```

### Environment Variables

```typescript
import { UpdateFunctionConfigurationCommand } from "@aws-sdk/client-lambda";

async function updateEnvironmentVariables(
  functionName: string,
  variables: Record<string, string>,
  profile: string,
  region: string
) {
  const client = getCachedLambdaClient(profile, region);
  
  const command = new UpdateFunctionConfigurationCommand({
    FunctionName: functionName,
    Environment: {
      Variables: variables,
    },
  });
  
  return await client.send(command);
}
```

## SQS Operations

### Get Queue Attributes (Check Message Count)

```typescript
import { GetQueueAttributesCommand } from "@aws-sdk/client-sqs";

async function getQueueMessageCount(queueUrl: string, profile: string, region: string) {
  const client = getCachedSQSClient(profile, region);
  
  const command = new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ["ApproximateNumberOfMessages"],
  });
  
  const response = await client.send(command);
  return parseInt(response.Attributes?.ApproximateNumberOfMessages || "0");
}
```

### Intelligent SQS Polling

**Best Practice: Check count before polling**

```typescript
import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";

async function pollQueueIntelligently(queueUrl: string, profile: string, region: string) {
  const client = getCachedSQSClient(profile, region);
  
  // 1. Check message count first
  const count = await getQueueMessageCount(queueUrl, profile, region);
  
  if (count === 0) {
    return []; // Skip polling if empty
  }
  
  // 2. Poll only if messages exist
  const command = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 5, // Short polling (5-10s max)
    AttributeNames: ["All"],
    MessageAttributeNames: ["All"],
  });
  
  const response = await client.send(command);
  return response.Messages || [];
}
```

### Toggle SQS Event Source Mapping

```typescript
import { 
  ListEventSourceMappingsCommand,
  UpdateEventSourceMappingCommand 
} from "@aws-sdk/client-lambda";

async function toggleSQSTrigger(
  functionName: string,
  enabled: boolean,
  profile: string,
  region: string
) {
  const client = getCachedLambdaClient(profile, region);
  
  // Find event source mapping
  const listCommand = new ListEventSourceMappingsCommand({
    FunctionName: functionName,
  });
  const mappings = await client.send(listCommand);
  
  // Update each mapping
  for (const mapping of mappings.EventSourceMappings || []) {
    const updateCommand = new UpdateEventSourceMappingCommand({
      UUID: mapping.UUID,
      Enabled: enabled,
    });
    await client.send(updateCommand);
  }
}
```

### Set Visibility Timeout

```typescript
import { ChangeMessageVisibilityCommand } from "@aws-sdk/client-sqs";

async function setMessageVisibility(
  queueUrl: string,
  receiptHandle: string,
  timeoutSeconds: number,
  profile: string,
  region: string
) {
  const client = getCachedSQSClient(profile, region);
  
  const command = new ChangeMessageVisibilityCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
    VisibilityTimeout: timeoutSeconds,
  });
  
  return await client.send(command);
}
```

## CloudWatch Logs

### Query Recent Logs

```typescript
import { 
  FilterLogEventsCommand,
  DescribeLogStreamsCommand 
} from "@aws-sdk/client-cloudwatch-logs";

async function getRecentLogs(
  functionName: string,
  hoursBack: number,
  profile: string,
  region: string
) {
  const client = getCachedCloudWatchLogsClient(profile, region);
  const logGroupName = `/aws/lambda/${functionName}`;
  
  const startTime = Date.now() - (hoursBack * 60 * 60 * 1000);
  
  const command = new FilterLogEventsCommand({
    logGroupName,
    startTime,
    limit: 100, // Limit results
  });
  
  try {
    const response = await client.send(command);
    return response.events || [];
  } catch (error) {
    // Log group might not exist
    console.error(`[CLOUDWATCH] Log group not found: ${logGroupName}`);
    return [];
  }
}
```

## S3 Operations

### List Objects in Bucket

```typescript
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getCachedS3Client } from '@/lib/aws-client';

async function listZipFiles(bucketName: string, profile: string, region: string) {
  const client = getCachedS3Client(profile, region);
  
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: "lambda-code/", // Optional prefix
  });
  
  const response = await client.send(command);
  return (response.Contents || [])
    .filter(obj => obj.Key?.endsWith('.zip'))
    .map(obj => obj.Key);
}
```

## DynamoDB Operations

### Scan with Filter

```typescript
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-providers";

async function scanCollectors(tableName: string, profile: string, region: string) {
  const client = new DynamoDBClient({
    region,
    credentials: fromIni({ profile }),
  });
  
  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: "attribute_exists(collectorType)",
  });
  
  const response = await client.send(command);
  return response.Items || [];
}
```

## Error Handling Patterns

### AWS SDK Error Types

```typescript
import { 
  ResourceNotFoundException,
  TooManyRequestsException,
  InvalidParameterValueException 
} from "@aws-sdk/client-lambda";

async function handleAWSErrors() {
  try {
    // AWS operation
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return { error: "Resource not found" };
    }
    if (error.name === 'TooManyRequestsException') {
      return { error: "Rate limit exceeded", retry: true };
    }
    if (error.name === 'InvalidParameterValueException') {
      return { error: "Invalid parameter" };
    }
    
    // Generic error
    console.error("[AWS-ERROR]", error);
    return { error: "AWS operation failed" };
  }
}
```

### Rate Limiting Retry

```typescript
async function retryWithBackoff(operation: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.name === 'TooManyRequestsException' && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

## Performance Optimizations

### Batch Operations

```typescript
// Instead of sequential
for (const lambda of lambdas) {
  await operation(lambda);
}

// Use parallel with limit
const BATCH_SIZE = 10;
for (let i = 0; i < lambdas.length; i += BATCH_SIZE) {
  const batch = lambdas.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(lambda => operation(lambda)));
}
```

### Connection Pooling

**Always use cached clients** - they maintain connection pools:
- Reuse TCP connections
- Reduce TLS handshake overhead
- Better throughput
- Lower latency

### Timeout Configuration

**Quick Operations**: 3s connection, 30s socket
**Logs/Heavy Operations**: 5s connection, 60s socket

## Common Patterns

### Multi-Region Operations

```typescript
async function operationAcrossRegions(
  operation: (profile: string, region: string) => Promise<any>,
  profile: string,
  regions: string[]
) {
  const results = await Promise.all(
    regions.map(region => 
      operation(profile, region).catch(err => ({ error: err.message, region }))
    )
  );
  
  return results;
}
```

### Profile Credential Reading

**Read from ~/.aws/credentials:**

```typescript
import fs from "fs";
import os from "os";
import path from "path";

function parseProfiles(file: string): string[] {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const matches = [...content.matchAll(/\[(.+?)\]/g)];
    return matches.map(m => m[1].replace(/^profile /, ""));
  } catch {
    return [];
  }
}

export function getAWSProfiles() {
  const home = os.homedir();
  const configPath = path.join(home, ".aws", "config");
  const credPath = path.join(home, ".aws", "credentials");
  
  return Array.from(new Set([
    ...parseProfiles(configPath),
    ...parseProfiles(credPath),
    "default"
  ]));
}
```

## Testing Tips

1. **Test with multiple profiles**: Ensure code works with different AWS accounts
2. **Test with multiple regions**: Verify region-specific operations
3. **Test error scenarios**: Simulate rate limits, missing resources, invalid params
4. **Monitor CloudWatch**: Check actual AWS API call patterns
5. **Use AWS CLI**: Verify permissions and resource existence

## Resources

- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Lambda API Reference](https://docs.aws.amazon.com/lambda/latest/dg/API_Reference.html)
- [SQS API Reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/)
- [CloudWatch Logs API](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/)

---

**Key Takeaway**: Always use cached clients, implement intelligent polling, handle errors gracefully, and optimize for performance.
