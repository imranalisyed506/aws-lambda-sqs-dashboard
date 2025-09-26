import { NextRequest, NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import { getLambdaClient, getCloudWatchLogsClient } from "@/lib/aws-client";
import { LambdaClient, paginateListFunctions } from "@aws-sdk/client-lambda";
import { FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { logMessage } from "@/lib/utils";

interface ErrorCollector {
  functionName: string;
  collectorId: string;
  collectorType: string;
  customerId: string;
  errorDescription: string;
  errorTimestamp: number;
  lastErrorTime: string;
  errorCount?: number;
  latestError: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile = searchParams.get("profile") || "default";
  const region = searchParams.get("region") || "us-east-1";
  const limit = parseInt(searchParams.get("limit") || "100"); // Allow limiting results
  const parallel = parseInt(searchParams.get("parallel") || "10"); // Parallel processing limit
  const timeoutMs = parseInt(searchParams.get("timeout") || "30000"); // 30 second timeout
  const collectorTypeFilter = searchParams.get("collectorType") || ""; // Filter by collector type
  const timeRange = searchParams.get("timeRange") || "2h"; // Time range parameter
  const filterPattern = searchParams.get("filterPattern") || 'error'; // Custom filter pattern
  console.log("Filter Pattern:", filterPattern);
  // Convert time range to milliseconds
  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case "15m": return 15 * 60 * 1000; // 15 minutes
      case "1h": return 60 * 60 * 1000; // 1 hour
      case "2h": return 2 * 60 * 60 * 1000; // 2 hours
      case "1d": return 24 * 60 * 60 * 1000; // 1 day
      default: return 2 * 60 * 60 * 1000; // Default to 2 hours
    }
  };

  const timeRangeMs = getTimeRangeMs(timeRange);
  const timeRangeLabel = timeRange === "15m" ? "15 minutes" : 
                        timeRange === "1h" ? "1 hour" :
                        timeRange === "2h" ? "2 hours" :
                        timeRange === "1d" ? "1 day" : "2 hours";

  const startTime = Date.now();
  logMessage("info", `API: Fetching error collectors for the past ${timeRangeLabel}`, { 
    profile, 
    region, 
    limit, 
    parallel, 
    timeoutMs, 
    collectorTypeFilter, 
    timeRange, 
    filterPattern 
  });

  // Static collector types list (same as inactive-collectors)
  const staticCollectorTypes = [
    'auth0', 'carbonblack', 'ciscoamp', 'ciscoduo','ciscomeraki',
    'crowdstrike', 'googlestackdriver', 'gsuite', 'mimecast',
    'o365', 'okta', 'sentinelone', 'salesforce', 'sophos', 
    'sophossiem', 'meraki', 'packages/lambda/al-s3-collector.zip'
  ];

  // Function to get collector type from paws_type_name environment variable
  function getCollectorTypeFromEnv(functionName: string, environment?: any): string {
    if (!environment) return 'unknown';
    
    const pawsTypeName = environment.paws_type_name || environment.aws_lambda_zipfile_name;
    
    if (pawsTypeName && staticCollectorTypes.includes(pawsTypeName)) {
      return pawsTypeName;
    }
    
    return 'unknown';
  }

  try {
    // Get all Lambda functions
    const credentials = fromIni({ profile });
    const lambdaClient = getLambdaClient(profile, region);
    
    const lambdas: any[] = [];
    const paginator = paginateListFunctions({ client: lambdaClient }, {});
    for await (const awsPage of paginator) {
      if (awsPage.Functions) lambdas.push(...awsPage.Functions);
    }

    logMessage("debug", "Found Lambda functions:", lambdas.length);

    // Filter to only include Alert Logic collectors
    const collectorFunctions = lambdas.filter(fn => {
      const description = fn.Description || "";
      return description === "Alert Logic S3 collector" || 
             description === "Alert Logic Poll based collector";
    });

    logMessage("debug", "Found Alert Logic collector functions:", collectorFunctions.length);

    const errorCollectors: ErrorCollector[] = [];
    const now = Date.now();
    const startTimeFilter = now - timeRangeMs; // Use dynamic time range

    // Function to check a single collector for errors
    async function checkCollectorErrors(fn: any): Promise<ErrorCollector | null> {
      try {
        const logGroupName = `/aws/lambda/${fn.FunctionName}`;
        const cloudwatchClient = getCloudWatchLogsClient(profile, region);

        // Optimized search with stricter filter and smaller limit
        const params = {
          logGroupName,
          startTime: startTimeFilter,
          endTime: now,
          filterPattern,
          limit: 10, // Reduced limit for faster response
        };

        const command = new FilterLogEventsCommand(params);
        const result = await cloudwatchClient.send(command);

        if (result.events && result.events.length > 0) {
          // Get the most recent error
          const sortedEvents = result.events.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
          const latestError = sortedEvents[0];

          // Get collector type from environment variables
          const environment = fn.Environment?.Variables || {};
          const collectorType = getCollectorTypeFromEnv(fn.FunctionName || '', environment);
          
          // Skip if not a recognized collector type and filtering is applied
          if (collectorTypeFilter && collectorType !== collectorTypeFilter) {
            return null;
          }

          // Extract collector ID from function name OR environment
          let collectorId = environment.collector_id || fn.FunctionName || 'unknown';

          // Extract customer ID from environment variables
          let customerId = environment.customer_id || environment.customerId || environment.CUSTOMER_ID || 'unknown';

          // Extract error description from log message
          let errorDescription = latestError.message || 'Unknown error';
          // Keep full error message without truncation

          return {
            functionName: fn.FunctionName || 'unknown',
            collectorId,
            collectorType,
            customerId,
            errorDescription,
            errorTimestamp: latestError.timestamp || 0,
            lastErrorTime: new Date(latestError.timestamp || 0).toISOString(),
            errorCount: result.events.length,
            latestError: errorDescription,
          };
        }
        return null;
      } catch (error) {
        logMessage("error", `Failed to fetch logs for ${fn.FunctionName}:`, error);
        return null;
      }
    }

    // Process collectors in parallel batches for better performance
    const batchSize = parallel;
    const collectorBatches = [];
    
    for (let i = 0; i < collectorFunctions.length; i += batchSize) {
      collectorBatches.push(collectorFunctions.slice(i, i + batchSize));
    }

    logMessage("debug", `Processing ${collectorFunctions.length} collectors in ${collectorBatches.length} batches of ${batchSize}`);

    // Process batches sequentially, but items within each batch in parallel
    for (const batch of collectorBatches) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        logMessage("info", `Timeout reached after ${Date.now() - startTime}ms, stopping processing`);
        break;
      }

      if (errorCollectors.length >= limit) {
        logMessage("debug", `Reached limit of ${limit} error collectors, stopping early`);
        break;
      }

      const batchPromises = batch.map(fn => checkCollectorErrors(fn));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          errorCollectors.push(result.value);
          if (errorCollectors.length >= limit) break;
        }
      }
      
      logMessage("debug", `Processed batch, found ${errorCollectors.length} error collectors so far`);
    }

    // Sort by most recent errors first
    errorCollectors.sort((a, b) => b.errorTimestamp - a.errorTimestamp);

    // Apply collector type filter if specified
    let filteredCollectors = errorCollectors;
    if (collectorTypeFilter && collectorTypeFilter !== '') {
      filteredCollectors = errorCollectors.filter(collector => 
        collector.collectorType === collectorTypeFilter
      );
      logMessage("debug", `Filtered to ${filteredCollectors.length} collectors of type: ${collectorTypeFilter}`);
    }

    // Return static collector types for filter dropdown
    const availableCollectorTypes = staticCollectorTypes.filter(type => 
      errorCollectors.some(collector => collector.collectorType === type)
    ).sort();

    const processingTime = Date.now() - startTime;
    logMessage("info", `Found ${filteredCollectors.length} collectors with errors in the past ${timeRangeLabel} (processed ${collectorFunctions.length} collectors in ${processingTime}ms)`);

    return NextResponse.json({
      errorCollectors: filteredCollectors,
      totalErrors: filteredCollectors.length,
      totalCollectors: collectorFunctions.length,
      availableCollectorTypes: availableCollectorTypes,
      staticCollectorTypes: staticCollectorTypes, // Include all static types
      timeRange: timeRangeLabel,
      processingTimeMs: processingTime,
      profile,
      region,
      limit,
      hasMore: errorCollectors.length >= limit && collectorFunctions.length > limit
    });

  } catch (error) {
    logMessage("error", "API: Error fetching error collectors", error);
    return NextResponse.json(
      { error: "Failed to fetch error collectors" },
      { status: 500 }
    );
  }
}