import { NextRequest, NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import { listAllLambdas } from "@/lib/aws-client";
import { logMessage } from "@/lib/utils";

interface InactiveUser {
  id: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  modifiedAt: string | null;
}

interface Collector {
  functionName: string;
  collectorName: string;
  pawsTypeName?: string;
  customerId: string;
  collectorId?: string;
  stackName?: string;
  lastModified: string;
  runtime: string;
  memorySize: number;
  description?: string;
}

interface CustomerCollectors {
  [customerId: string]: {
    collectors: Collector[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profile = searchParams.get("profile") || "paws";
    const region = searchParams.get("region") || "us-east-1";
    const collectorType = searchParams.get("collectorType") || "";

    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: "Authentication token is required" }, { status: 401 });
    }

    logMessage("info", "API: Fetching inactive collectors", { profile, region, collectorType });

    // First, get inactive users from external API
    const inactiveUsers = await getInactiveUsers(token);
    console.log("Inactive users fetched:", inactiveUsers.length);
    const inactiveUserIds = new Set(inactiveUsers.map((user: any) => user.id));

    // Get all Lambda functions for the profile
    const functions = await listAllLambdas(profile, region);
    console.log("Total Lambda functions fetched:", functions.length,"in region",region,"profile",profile);
    // Define collector types
    const collectors = [
      'auth0', 'carbonblack', 'ciscoamp', 'ciscoduo','ciscomeraki',
      'crowdstrike', 'googlestackdriver', 'gsuite', 'mimecast',
      'o365', 'okta', 'sentinelone', 'salesforce', 'sophos', 
      'sophossiem', 'meraki', 'packages/lambda/al-s3-collector.zip'
    ];

    // Map collector environments by customer ID
    const customerCollectors: CustomerCollectors = {};

    for (const fn of functions) {
      const environment = fn.Environment?.Variables || {};
      const pawsType = environment.paws_type_name || environment.aws_lambda_zipfile_name;
      const customerId = environment.customer_id;

      // If collectorType is set, only include matching collectors
      const isTypeMatch = !collectorType || pawsType === collectorType;

      if (pawsType && collectors.includes(pawsType) && customerId && isTypeMatch) {
        if (!customerCollectors[customerId]) {
          customerCollectors[customerId] = { collectors: [] };
        }

        customerCollectors[customerId].collectors.push({
          functionName: fn.FunctionName || 'Unknown',
          collectorName: pawsType,
          pawsTypeName: environment.paws_type_name,
          customerId: environment.customer_id,
          collectorId: environment.collector_id,
          stackName: environment.stack_name,
          lastModified: fn.LastModified || new Date().toISOString(),
          runtime: fn.Runtime || 'Unknown',
          memorySize: fn.MemorySize || 0,
          description: fn.Description,
        });
      }
    }

    // Filter for inactive users only
    const inactiveUsersCollectors = [];
    for (const [customerId, data] of Object.entries(customerCollectors)) {
      if (inactiveUserIds.has(customerId)) {
        inactiveUsersCollectors.push({
          customerId,
          collectors: data.collectors
        });
      }
    }

    return NextResponse.json({
      inactiveUsers,
      inactiveUsersCollectors,
      totalInactiveUsers: inactiveUsers.length,
      totalInactiveCollectors: inactiveUsersCollectors.reduce((sum, user) => sum + user.collectors.length, 0)
    });

  } catch (error) {
    logMessage("error", "API: Error fetching inactive collectors", error);
    return NextResponse.json(
      { error: "Failed to fetch inactive collectors" },
      { status: 500 }
    );
  }
}

async function getInactiveUsers(token: string) {
  const baseUrl = process.env.US_URL_PROD;
  if (!baseUrl) {
    throw new Error("US_URL_PROD environment variable is not set");
  }

  const url = `${baseUrl}/aims/v1/2/accounts/managed?active=false`;
  const headers = {
    'x-aims-auth-token': token,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { 
    headers,
    method: 'GET'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.accounts || !Array.isArray(data.accounts)) {
    throw new Error("Invalid response format: accounts array not found");
  }
  
  return data.accounts.map((acc: any) => ({
    id: acc.id,
    name: acc.name || 'Unknown',
    active: acc.active,
    createdAt: acc.created?.at ? new Date(acc.created.at * 1000).toISOString() : null,
    modifiedAt: acc.modified?.at ? new Date(acc.modified.at * 1000).toISOString() : null
  }));
}