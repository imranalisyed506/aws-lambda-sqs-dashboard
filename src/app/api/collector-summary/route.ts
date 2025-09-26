import { NextRequest, NextResponse } from "next/server";
import { listLambdasBatch, getSqsQueueStatus } from "@/lib/aws-client";
import { fromIni } from "@aws-sdk/credential-providers";

interface CollectorDetails {
  functionName: string;
  collectorType: string;
  customerId: string;
  sqsMessageCount?: number;
  pawsStateQueueUrl?: string;
}

// Returns a summary of collector types and their counts for a given profile/region
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile = searchParams.get("profile") || "default";
  const region = searchParams.get("region") || "us-east-1";
    try {
      const credentials = fromIni({ profile });
      const lambdas = await listLambdasBatch(region, credentials, 0, 1000); // fetch up to 1000
      
      // Filter to only include Alert Logic collectors
      const alertLogicCollectors = lambdas.filter(fn => {
        const description = fn.Description || "";
        return description === "Alert Logic S3 collector" || 
               description === "Alert Logic Poll based collector";
      });
      
      // For each Alert Logic lambda, get collectorType and customerId from env vars or Description
      const collectorCounts: Record<string, number> = {};
      const collectorDetails: CollectorDetails[] = [];
      const customerCollectorCounts: Record<string, Record<string, number>> = {};
      
      // For each collector, fetch SQS message count using paws_state_queue_url
      for (const fn of alertLogicCollectors) {
        let type = "-";
        if (fn.Description === "Alert Logic S3 collector") {
          type = "s3-collector";
        }
        else if(fn.Description === "Alert Logic Poll based collector") {
          type = fn.Environment?.Variables?.paws_type_name
        }
        else {
          type = fn.Environment?.Variables?.paws_type_name || "-";
        }
        // Extract customer ID from environment variables
        const environment = fn.Environment?.Variables || {};
        const customerId = environment.customer_id || environment.customerId || environment.CUSTOMER_ID || 'unknown';
        // Count by collector type
        collectorCounts[type] = (collectorCounts[type] || 0) + 1;
        // Get SQS message count for this collector
        let sqsMessageCount = undefined;
        const queueUrl = environment.paws_state_queue_url;
        if (queueUrl) {
          try {
            const sqsStatus = await getSqsQueueStatus(profile, region, queueUrl);
            sqsMessageCount = sqsStatus?.totalMessages ?? undefined;
          } catch (e) {
            sqsMessageCount = undefined;
          }
        }
        // Store detailed information
        collectorDetails.push({
          functionName: fn.FunctionName || 'unknown',
          collectorType: type,
          customerId: customerId,
          sqsMessageCount,
          pawsStateQueueUrl: queueUrl
        });
        // Count by customer and collector type
        if (!customerCollectorCounts[customerId]) {
          customerCollectorCounts[customerId] = {};
        }
        customerCollectorCounts[customerId][type] = (customerCollectorCounts[customerId][type] || 0) + 1;
      }
      
      // Calculate customer statistics
      const totalCustomers = Object.keys(customerCollectorCounts).length;
      const customersWithCollectors = Object.keys(customerCollectorCounts).filter(
        customerId => Object.values(customerCollectorCounts[customerId]).some(count => count > 0)
      ).length;
      
      return NextResponse.json({ 
        collectorCounts,
        collectorDetails,
        customerCollectorCounts,
        totalCustomers,
        customersWithCollectors,
        totalCollectors: collectorDetails.length
      });
    } catch (err: any) {
      if (err?.name === 'TooManyRequestsException' || err?.Reason === 'CallerRateLimitExceeded') {
        return NextResponse.json({ error: 'AWS rate limit exceeded. Please try again later.' }, { status: 429 });
      }
      return NextResponse.json({ error: err?.message || 'Failed to fetch collector summary.' }, { status: 500 });
    }
}
