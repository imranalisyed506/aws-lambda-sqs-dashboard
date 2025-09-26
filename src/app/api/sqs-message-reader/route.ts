import { NextRequest, NextResponse } from "next/server";
import { getCollectors, getEventSourceMappings } from "@/lib/collector-admin";
import { getSqsClient } from "@/lib/aws-client";
import { ReceiveMessageCommand, GetQueueAttributesCommand } from "@aws-sdk/client-sqs";

interface MessageData {
  functionName: string;
  customerId: string;
  collectorId: string;
  queueUrl: string;
  sqsEnabled: boolean;
  sqsAttributes: any;
  messages?: {
    body: any;
    since?: string;
    until?: string;
    stream?: string;
    messageId?: string;
    timestamp?: string;
    receiptHandle?: string;
  }[];
  latestMessage?: {
    body: any;
    since?: string;
    until?: string;
    stream?: string;
    messageId?: string;
    timestamp?: string;
  };
  configUpdate?: {
    success: boolean;
    message: string;
    currentConfig?: any;
    updatedConfig?: any;
    extractedData?: { since?: string; until?: string; stream?: string };
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('📨 [DEBUG] API Request received:', {
      method: req.method,
      url: req.url,
      body: JSON.stringify(body, null, 2)
    });
    
    const {
      collectorType,
      profile,
      region,
      descriptionFilter,
      username, // This receives accesskey from frontend
      password, // This receives secretkey from frontend  
      updateOnly = false, // New flag for config-only updates
      getOnly = false, // New flag for get-config-only requests
      testAuth = false, // New flag for authentication testing
      customerId,
      collectorId,
      extractedData
    } = body;

    // If this is an authentication test request
    if (testAuth) {
      if (!username || !password) {
        return NextResponse.json({ 
          ok: false, 
          error: "Access key and secret key are required for authentication test" 
        }, { status: 400 });
      }

      try {
        console.log('🔐 [DEBUG] Testing authentication for user:', username);
        
        const baseUrl = process.env.US_URL_PROD;
        if (!baseUrl) {
          return NextResponse.json({ 
            ok: false, 
            error: "API configuration missing" 
          }, { status: 500 });
        }

        const authUrl = `${baseUrl}/aims/v1/authenticate`;
        const authHeader = Buffer.from(`${username}:${password}`).toString('base64');

        const authResponse = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
          }
        });

        if (!authResponse.ok) {
          throw new Error(`Authentication failed (${authResponse.status})`);
        }

        const authData = await authResponse.json();
        const authToken = authData.authentication?.token;
        
        console.log('✅ [DEBUG] Authentication test successful');
        
        return NextResponse.json({ 
          ok: true, 
          message: "Authentication successful",
          authToken: authToken
        });

      } catch (error: any) {
        console.error("❌ [DEBUG] Authentication test error:", error?.message || error);
        return NextResponse.json({ 
          ok: false, 
          error: error.message || "Authentication test failed" 
        }, { status: 401 });
      }
    }

    // If this is a get-config-only request
    if (getOnly) {
      if (!username || !password) {
        return NextResponse.json({ 
          ok: false, 
          error: "Access key and secret key are required" 
        }, { status: 400 });
      }

      if (!customerId || !collectorId) {
        return NextResponse.json({ 
          ok: false, 
          error: "Customer ID and collector ID are required" 
        }, { status: 400 });
      }

      try {
        // Get authentication token
        const baseUrl = process.env.US_URL_PROD;
        if (!baseUrl) {
          return NextResponse.json({ 
            ok: false, 
            error: "API configuration missing" 
          }, { status: 500 });
        }

        const authUrl = `${baseUrl}/aims/v1/authenticate`;
        const authHeader = Buffer.from(`${username}:${password}`).toString('base64');

        const authResponse = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
          }
        });

        if (!authResponse.ok) {
          return NextResponse.json({ 
            ok: false, 
            error: "Authentication failed" 
          }, { status: authResponse.status });
        }

        const authData = await authResponse.json();
        const authToken = authData?.authentication?.token;

        if (!authToken) {
          return NextResponse.json({ 
            ok: false, 
            error: "Invalid authentication response" 
          }, { status: 500 });
        }

        console.log('🚀 [DEBUG] Starting GET Config request for:', customerId, collectorId);

        // Get the collector configuration
        console.log('📋 [DEBUG] Getting collector configuration:');
        console.log('  Customer ID:', customerId);
        console.log('  Collector ID:', collectorId);
        console.log('  Auth Token (first 20 chars):', authToken.substring(0, 20) + '...');
        
        const currentConfig = await getCollectorConfig(
          customerId,
          collectorId,
          authToken
        );

        console.log('📋 [DEBUG] Config retrieved successfully:');
        console.log('  Retrieved Config:', JSON.stringify(currentConfig, null, 2));

        return NextResponse.json({ 
          ok: true, 
          currentConfig: currentConfig 
        });

        } catch (error: any) {
        console.error("❌ [DEBUG] Get config error for", customerId, collectorId, ":", error?.message || error);
        return NextResponse.json({ 
          ok: false, 
          error: error.message || "Failed to retrieve configuration" 
        }, { status: 500 });
      }
    }

    // If this is a config-only update request
    if (updateOnly) {
      console.log('🔧 [DEBUG] Starting UPDATE Config request for:', customerId, collectorId);
      
      if (!username || !password) {
        return NextResponse.json({ 
          ok: false, 
          error: "Access key and secret key are required" 
        }, { status: 400 });
      }

      if (!customerId || !collectorId || !extractedData) {
        return NextResponse.json({ 
          ok: false, 
          error: "Customer ID, collector ID, and extracted data are required" 
        }, { status: 400 });
      }

      try {
        // Get authentication token
        const baseUrl = process.env.US_URL_PROD;
        if (!baseUrl) {
          return NextResponse.json({ 
            ok: false, 
            error: "API configuration missing" 
          }, { status: 500 });
        }

        const authUrl = `${baseUrl}/aims/v1/authenticate`;
        const authHeader = Buffer.from(`${username}:${password}`).toString('base64');

        const authResponse = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
          }
        });

        if (!authResponse.ok) {
          return NextResponse.json({ 
            ok: false, 
            error: "Authentication failed" 
          }, { status: authResponse.status });
        }

        const authData = await authResponse.json();
        const authToken = authData?.authentication?.token;

        if (!authToken) {
          return NextResponse.json({ 
            ok: false, 
            error: "Invalid authentication response" 
          }, { status: 500 });
        }

        // Update the collector configuration
        const configResult = await updateCollectorConfigInternal(
          customerId,
          collectorId,
          authToken,
          extractedData
        );

        return NextResponse.json({ 
          ok: true, 
          configUpdate: configResult 
        });

      } catch (error: any) {
        console.error("Config update error:", error);
        return NextResponse.json({ 
          ok: false, 
          error: error.message || "Configuration update failed" 
        }, { status: 500 });
      }
    }

    // Validate required parameters  
    if (!collectorType || !profile || !region) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required parameters: collectorType, profile, and region are required" 
      }, { status: 400 });
    }

    // Step 1: Get collectors (similar to collector-admin)
    const collectors = await getCollectors(
      collectorType,
      profile,
      region,
      ["Alerts", "Incident"], // Default streams
      descriptionFilter
    );

    const results: MessageData[] = [];

    for (const collector of collectors) {
      const { name, env } = collector;
      const queueUrl = env.paws_state_queue_url;
      const collectorId = env.collector_id;
      const customerId = env.customer_id;

      // Get current SQS status with error handling
      let eventSourceMappings: any[] = [];
      let sqsEnabled = false;
      try {
        eventSourceMappings = await getEventSourceMappings(name, profile, region);
        sqsEnabled = eventSourceMappings.length > 0 && eventSourceMappings.some(mapping => mapping.State === 'Enabled');
      } catch (error) {
        console.error(`Failed to get event source mappings for ${name}:`, error);
      }
      
      // Get comprehensive SQS attributes with better error handling
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
          sqsAttributes = {}; // Ensure we have a valid object
        }
      }

      const messageData: MessageData = {
        functionName: name,
        customerId,
        collectorId,
        queueUrl,
        sqsEnabled,
        sqsAttributes
      };

      if (!queueUrl) {
        messageData.error = "No SQS queue URL found";
        results.push(messageData);
        continue;
      }

      try {
        // Get ALL messages from SQS with enhanced retrieval strategy
        const sqsClient = getSqsClient(profile, region);
        const allMessages: any[] = [];
        let attempts = 0;
        const maxAttempts = 5;
        
        // Check if queue has messages first
        const visibleMessages = parseInt(sqsAttributes?.ApproximateNumberOfMessages || "0");
        const inFlightMessages = parseInt(sqsAttributes?.ApproximateNumberOfMessagesNotVisible || "0");
        const totalMessages = visibleMessages + inFlightMessages;
        
        if (totalMessages === 0) {
          messageData.error = "No messages in queue";
          results.push(messageData);
          continue;
        }
        
        console.log(`📊 [DEBUG] Queue ${queueUrl} has ${visibleMessages} visible and ${inFlightMessages} in-flight messages`);
        
        // Multiple retrieval attempts to get ALL available messages
        while (attempts < maxAttempts) {
          attempts++;
          let receiveResult;
          
          try {
            if (attempts === 1) {
              // First attempt: Get up to 10 messages with no wait
              receiveResult = await sqsClient.send(
                new ReceiveMessageCommand({
                  QueueUrl: queueUrl,
                  MaxNumberOfMessages: 10, // Get up to 10 messages at once
                  WaitTimeSeconds: 0, // No wait for immediate response
                  VisibilityTimeout: 1, // Very short visibility timeout
                  AttributeNames: ['All'],
                  MessageAttributeNames: ['All']
                })
              );
            } else if (attempts <= 3) {
              // Attempts 2-3: Short poll with brief delays
              await new Promise(resolve => setTimeout(resolve, 300 * attempts)); // Progressive delay
              receiveResult = await sqsClient.send(
                new ReceiveMessageCommand({
                  QueueUrl: queueUrl,
                  MaxNumberOfMessages: 10,
                  WaitTimeSeconds: 2, // Short poll
                  VisibilityTimeout: 1,
                  AttributeNames: ['All'],
                  MessageAttributeNames: ['All']
                })
              );
            } else {
              // Final attempts: Long poll to ensure we get any remaining messages
              await new Promise(resolve => setTimeout(resolve, 1000)); // Longer pause
              receiveResult = await sqsClient.send(
                new ReceiveMessageCommand({
                  QueueUrl: queueUrl,
                  MaxNumberOfMessages: 10,
                  WaitTimeSeconds: 5, // Long poll
                  VisibilityTimeout: 2, // Slightly longer for final attempt
                  AttributeNames: ['All'],
                  MessageAttributeNames: ['All']
                })
              );
            }
            
            if (receiveResult?.Messages?.length) {
              console.log(`📨 [DEBUG] Attempt ${attempts} retrieved ${receiveResult.Messages.length} messages from ${queueUrl}`);
              allMessages.push(...receiveResult.Messages);
              
              // If we got fewer than 10 messages, we probably got all available
              if (receiveResult.Messages.length < 10) {
                console.log(`📭 [DEBUG] Received less than 10 messages, likely got all available messages`);
                break;
              }
            } else {
              console.log(`📭 [DEBUG] Attempt ${attempts} retrieved no messages from ${queueUrl}`);
              // If we have some messages already and this attempt returned none, we're done
              if (allMessages.length > 0) {
                break;
              }
            }
          } catch (attemptError) {
            console.error(`❌ [DEBUG] Attempt ${attempts} failed:`, attemptError);
            // Continue to next attempt unless it's the final attempt
            if (attempts === maxAttempts) {
              throw attemptError;
            }
          }
        }

        console.log(`📊 [DEBUG] Total messages retrieved from ${queueUrl}: ${allMessages.length}`);

        if (allMessages.length > 0) {
          const processedMessages = [];
          let latestMessage = null;
          let latestTimestamp = 0;
          
          for (const message of allMessages) {
            let messageBody;
            let since: string | undefined;
            let until: string | undefined;
            let stream: string | undefined;
            const messageTimestamp = message.Attributes?.SentTimestamp 
              ? parseInt(message.Attributes.SentTimestamp) 
              : 0;

            try {
              // Parse the message body
              messageBody = JSON.parse(message.Body || '{}');
              
              // Extract since, until, and stream from various possible locations in the message
              since = extractDateValue(messageBody, [
                'since', 'sinceDate', 'start_date', 'startDate', 'from', 'fromDate',
                'since_date', 'start', 'startTime', 'since_time', 'fromTime',
                'beginDate', 'begin_date', 'startDatetime', 'since_datetime'
              ]);
              until = extractDateValue(messageBody, [
                'until', 'untilDate', 'end_date', 'endDate', 'to', 'toDate',
                'until_date', 'end', 'endTime', 'until_time', 'toTime',
                'finishDate', 'finish_date', 'endDatetime', 'until_datetime'
              ]);
              
              // Extract stream information
              stream = extractStringValue(messageBody, [
                'stream', 'streamName', 'stream_name', 'type', 'eventType',
                'event_type', 'source', 'sourceName', 'source_name', 'category'
              ]);

            } catch (parseError) {
              console.warn(`Failed to parse message body as JSON for ${queueUrl}:`, parseError);
              messageBody = message.Body; // Keep as string if not JSON
              
              // Try to extract dates and stream from string format
              if (typeof message.Body === 'string') {
                since = extractDateFromString(message.Body, ['since', 'start', 'from']);
                until = extractDateFromString(message.Body, ['until', 'end', 'to']);
                stream = extractDateFromString(message.Body, ['stream', 'type', 'source']);
              }
            }
            
            const processedMessage = {
              body: messageBody,
              since,
              until,
              stream,
              messageId: message.MessageId,
              receiptHandle: message.ReceiptHandle,
              timestamp: messageTimestamp 
                ? new Date(messageTimestamp).toISOString()
                : undefined
            };
            
            processedMessages.push(processedMessage);
            
            // Track the latest message (most recent by timestamp)
            if (messageTimestamp > latestTimestamp) {
              latestTimestamp = messageTimestamp;
              latestMessage = {
                body: messageBody,
                since,
                until,
                stream,
                messageId: message.MessageId,
                timestamp: messageTimestamp 
                  ? new Date(messageTimestamp).toISOString()
                  : undefined
              };
            }
          }
          
          // Sort messages by timestamp (newest first)
          processedMessages.sort((a, b) => {
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bTime - aTime;
          });
          
          messageData.messages = processedMessages;
          if (latestMessage) {
            messageData.latestMessage = latestMessage;
          }
          
        } else {
          // Enhanced error messaging based on queue state
          if (totalMessages > 0) {
            if (visibleMessages === 0 && inFlightMessages > 0) {
              messageData.error = `${inFlightMessages} message(s) in flight, try again shortly`;
            } else {
              messageData.error = `Queue has ${totalMessages} message(s) but none retrieved after ${maxAttempts} attempts`;
            }
          } else {
            messageData.error = "No messages in queue";
          }
        }

      } catch (error: any) {
        console.error(`Failed to read message from queue ${queueUrl}:`, error);
        const errorMessage = error?.message || error?.name || String(error);
        const errorCode = error?.Code || error?.$metadata?.httpStatusCode;
        
        if (errorCode === 'QueueDoesNotExist' || errorMessage.includes('does not exist')) {
          messageData.error = "Queue does not exist";
        } else if (errorCode === 'AccessDenied' || errorMessage.includes('AccessDenied')) {
          messageData.error = "Access denied to queue";
        } else {
          messageData.error = `Failed to read message: ${errorMessage}`;
        }
      }

      results.push(messageData);
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("SQS message reader API error:", err);
    const errorMessage = err?.message || err?.name || String(err);
    const awsErrorCode = err?.Code || err?.$metadata?.httpStatusCode;
    const detailedError = awsErrorCode ? `AWS Error (${awsErrorCode}): ${errorMessage}` : `Error: ${errorMessage}`;
    return NextResponse.json({ ok: false, error: detailedError }, { status: 500 });
  }
}

// Helper function to get collector configuration
async function getCollectorConfig(
  customerId: string,
  collectorId: string,
  authToken: string
) {
  const baseUrl = process.env.US_URL_PROD;
  if (!baseUrl) {
    throw new Error("API configuration missing");
  }

  const configUrl = `${baseUrl}/azcollect/v1/${customerId}/paws/config/${collectorId}`;
  const headers = {
    'x-aims-auth-token': authToken,
    'Content-Type': 'application/json'
  };

  console.log('📥 [DEBUG] GET Config API Call:');
  console.log('  URL:', configUrl);
  console.log('  Method: GET');
  console.log('  Customer ID:', customerId);
  console.log('  Collector ID:', collectorId);
  console.log('  Headers:', {
    'x-aims-auth-token': authToken.substring(0, 20) + '...',
    'Content-Type': 'application/json'
  });

  const response = await fetch(configUrl, {
    method: 'GET',
    headers
  });

  console.log('📥 [DEBUG] GET Config Response:');
  console.log('  Status:', response.status);
  console.log('  StatusText:', response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get config (${response.status}): ${errorText}`);
  }

  const configData = await response.json();
  console.log('📥 [DEBUG] GET Config Data Received:');
  console.log('  Response Data:', JSON.stringify(configData, null, 2));
  console.log('  Response Data Keys:', Object.keys(configData || {}));
  
  // Extract and specifically log since/until values if they exist
  if (configData && typeof configData === 'object') {
    // Try multiple possible locations for the config values
    const possibleSinceFields = ['since', 'sinceDate', 'start_date', 'startDate', 'from', 'fromDate', 'since_date', 'start', 'startTime'];
    const possibleUntilFields = ['until', 'untilDate', 'end_date', 'endDate', 'to', 'toDate', 'until_date', 'end', 'endTime'];
    const possibleStreamFields = ['stream', 'streamName', 'stream_name', 'type', 'eventType', 'event_type', 'source', 'sourceName'];
    
    console.log('🔍 [DEBUG] Searching for config values in response:');
    
    // Check if config data has nested objects
    if (configData.config) {
      console.log('  Found nested config object:', JSON.stringify(configData.config, null, 2));
    }
    
    // Search for since values
    let foundSince = null;
    for (const field of possibleSinceFields) {
      if (configData[field] !== undefined) {
        foundSince = configData[field];
        console.log(`  Found 'since' in field '${field}':`, foundSince);
        break;
      }
      if (configData.config && configData.config[field] !== undefined) {
        foundSince = configData.config[field];
        console.log(`  Found 'since' in nested config.${field}:`, foundSince);
        break;
      }
    }
    
    // Search for until values  
    let foundUntil = null;
    for (const field of possibleUntilFields) {
      if (configData[field] !== undefined) {
        foundUntil = configData[field];
        console.log(`  Found 'until' in field '${field}':`, foundUntil);
        break;
      }
      if (configData.config && configData.config[field] !== undefined) {
        foundUntil = configData.config[field];
        console.log(`  Found 'until' in nested config.${field}:`, foundUntil);
        break;
      }
    }
    
    // Search for stream values
    let foundStream = null;
    for (const field of possibleStreamFields) {
      if (configData[field] !== undefined) {
        foundStream = configData[field];
        console.log(`  Found 'stream' in field '${field}':`, foundStream);
        break;
      }
      if (configData.config && configData.config[field] !== undefined) {
        foundStream = configData.config[field];
        console.log(`  Found 'stream' in nested config.${field}:`, foundStream);
        break;
      }
    }
    
    console.log('🔍 [DEBUG] Final extracted values:');
    console.log('  Since Value:', foundSince || 'NOT FOUND');
    console.log('  Until Value:', foundUntil || 'NOT FOUND');  
    console.log('  Stream Value:', foundStream || 'NOT FOUND');
    console.log('  Timestamp of GET Config:', new Date().toISOString());
  }

  return configData;
}

// Helper function to update collector configuration
async function updateCollectorConfigInternal(
  customerId: string,
  collectorId: string,
  authToken: string,
  extractedData: { since?: string; until?: string; stream?: string }
) {
  try {
    // Step 1: Get current configuration
    console.log('🔄 [DEBUG] Starting Config Update Process:');
    console.log('  Customer ID:', customerId);
    console.log('  Collector ID:', collectorId);
    
    const currentConfig = await getCollectorConfig(customerId, collectorId, authToken);
    
    console.log('📋 [DEBUG] Current Config Retrieved:');
    console.log('  Current Config:', JSON.stringify(currentConfig, null, 2));
    
    // Step 2: Create updated configuration by merging extracted data
    console.log('🔧 [DEBUG] Starting Configuration Merge Process:');
    console.log('  Retrieved Config from GET API:', JSON.stringify(currentConfig, null, 2));
    
    // Create a proper deep copy of the current config to avoid mutations
    const updatedConfig = JSON.parse(JSON.stringify(currentConfig));
    
    console.log('🔧 [DEBUG] Configuration Object Structure Analysis:');
    console.log('  Full Config Object Keys:', Object.keys(currentConfig || {}));
    console.log('  Has pawsConfig object:', !!currentConfig.pawsConfig);
    console.log('  Has paws_config object:', !!currentConfig.paws_config);
    console.log('  Has config object:', !!currentConfig.config);
    console.log('  Has parameters object:', !!currentConfig.parameters);
    
    // Check for pawsConfig object (most likely location)
    let pawsConfigObject = null;
    let pawsConfigPath = '';
    
    if (currentConfig.pawsConfig && typeof currentConfig.pawsConfig === 'object') {
      pawsConfigObject = updatedConfig.pawsConfig;
      pawsConfigPath = 'pawsConfig';
      console.log('  ✅ Found pawsConfig object');
    } else if (currentConfig.paws_config && typeof currentConfig.paws_config === 'object') {
      pawsConfigObject = updatedConfig.paws_config;
      pawsConfigPath = 'paws_config';
      console.log('  ✅ Found paws_config object (snake_case)');
    } else if (currentConfig.config && typeof currentConfig.config === 'object') {
      pawsConfigObject = updatedConfig.config;
      pawsConfigPath = 'config';
      console.log('  ✅ Using config object as fallback');
    } else {
      // Create pawsConfig if it doesn't exist
      updatedConfig.pawsConfig = {};
      pawsConfigObject = updatedConfig.pawsConfig;
      pawsConfigPath = 'pawsConfig (newly created)';
      console.log('  ⚠️ No pawsConfig found, creating new pawsConfig object');
    }
    
    console.log('🔧 [DEBUG] PawsConfig Object Before Updates:');
    console.log(`  ${pawsConfigPath} content:`, JSON.stringify(pawsConfigObject, null, 2));
    console.log(`  ${pawsConfigPath} keys:`, Object.keys(pawsConfigObject || {}));
    
    console.log('🔧 [DEBUG] Stream Value Validation and Config Update:');
    
    // Get current stream value from pawsConfig
    const currentStreamValue = pawsConfigObject.stream;
    const sqsStreamValue = extractedData.stream;
    
    console.log('  🔍 Stream Comparison:');
    console.log(`    Current config stream:`, currentStreamValue || 'undefined');
    console.log(`    SQS message stream:`, sqsStreamValue || 'undefined');
    
    // Check if stream values match
    const streamsMatch = currentStreamValue && sqsStreamValue && 
                        currentStreamValue.trim().toLowerCase() === sqsStreamValue.trim().toLowerCase();
    
    console.log(`    Streams match:`, streamsMatch);
    
    if (streamsMatch) {
      console.log('  ✅ Stream values match - proceeding with since/until updates');
      
      // Apply since and until values only if streams match
      if (extractedData.since) {
        console.log(`  🕐 Setting since in ${pawsConfigPath}:`);
        console.log(`    Previous value:`, pawsConfigObject.since || 'undefined');
        console.log(`    New value:`, extractedData.since);
        pawsConfigObject.since = extractedData.since;
        console.log(`    Applied successfully:`, pawsConfigObject.since);
      }
      
      if (extractedData.until) {
        console.log(`  🕐 Setting until in ${pawsConfigPath}:`);
        console.log(`    Previous value:`, pawsConfigObject.until || 'undefined');
        console.log(`    New value:`, extractedData.until);
        pawsConfigObject.until = extractedData.until;
        console.log(`    Applied successfully:`, pawsConfigObject.until);
      }
      
      // Update stream value to ensure consistency
      if (extractedData.stream) {
        console.log(`  🔄 Confirming stream in ${pawsConfigPath}:`);
        console.log(`    Previous value:`, pawsConfigObject.stream || 'undefined');
        console.log(`    New value:`, extractedData.stream);
        pawsConfigObject.stream = extractedData.stream;
        console.log(`    Applied successfully:`, pawsConfigObject.stream);
      }
      
    } else {
      console.log('  ❌ Stream values do not match - aborting configuration update');
      console.log('  🚫 Skipping PUT API call due to stream mismatch');
      
      const errorMessage = `Stream mismatch: Config stream '${currentStreamValue || 'undefined'}' does not match SQS stream '${sqsStreamValue || 'undefined'}'`;
      console.log('  📛 Error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        streamMismatch: true,
        configStream: currentStreamValue,
        sqsStream: sqsStreamValue
      };
    }
    
    console.log('🔧 [DEBUG] PawsConfig Object After Updates:');
    console.log(`  Updated ${pawsConfigPath} content:`, JSON.stringify(pawsConfigObject, null, 2));
    
    console.log('🔧 [DEBUG] Complete Updated Configuration Object:');
    console.log('  Full Updated Config:', JSON.stringify(updatedConfig, null, 2));
    console.log('  Config Path Used:', pawsConfigPath);

    // Step 3: PUT the updated configuration
    const baseUrl = process.env.US_URL_PROD;
    if (!baseUrl) {
      throw new Error("API configuration missing");
    }

    const configUrl = `${baseUrl}/azcollect/v1/${customerId}/paws/config/${collectorId}`;
    const headers = {
      'x-aims-auth-token': authToken,
      'Content-Type': 'application/json'
    };
    
    const requestBody = JSON.stringify(updatedConfig);
    
    console.log('📤 [DEBUG] PUT Config API Call:');
    console.log('  ===========================================');
    console.log('  🚀 REST API PUT CONFIG CALL STARTING');
    console.log('  ===========================================');
    console.log('  URL:', configUrl);
    console.log('  Method: PUT');
    console.log('  Customer ID:', customerId);
    console.log('  Collector ID:', collectorId);
    console.log('  Headers:', {
      'x-aims-auth-token': authToken.substring(0, 20) + '...',
      'Content-Type': 'application/json'
    });
    console.log('  ===========================================');
    console.log('  📋 REQUEST BODY (Raw JSON String):');
    console.log('  ', requestBody);
    console.log('  ===========================================');
    console.log('  📋 REQUEST BODY (Formatted JSON):');
    console.log(JSON.stringify(updatedConfig, null, 4));
    console.log('  ===========================================');
    console.log('  📡 Sending PUT request to Alert Logic API...');

    const putResponse = await fetch(configUrl, {
      method: 'PUT',
      headers,
      body: requestBody
    });

    console.log('📤 [DEBUG] PUT Config Response:');
    console.log('  ===========================================');
    console.log('  📥 REST API PUT CONFIG RESPONSE RECEIVED');
    console.log('  ===========================================');
    console.log('  Status:', putResponse.status);
    console.log('  StatusText:', putResponse.statusText);
    console.log('  Success:', putResponse.ok);
    console.log('  ===========================================');

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`Failed to update config (${putResponse.status}): ${errorText}`);
    }

    const updatedResult = await putResponse.json();
    
    console.log('✅ [DEBUG] Config Update Successful:');
    console.log('  Original Config:', JSON.stringify(currentConfig, null, 2));
    console.log('  Original Config Keys:', Object.keys(currentConfig || {}));
    console.log('  Updated Result:', JSON.stringify(updatedResult, null, 2));
    console.log('  Updated Result Keys:', Object.keys(updatedResult || {}));
    
    // Check what structure the updated result has
    if (updatedResult && typeof updatedResult === 'object') {
      console.log('🔍 [DEBUG] Checking updated result structure:');
      if (updatedResult.config) {
        console.log('  Updated result has nested config:', JSON.stringify(updatedResult.config, null, 2));
      }
      
      // Look for the values we just set
      const updatedSince = updatedResult.since || (updatedResult.config && updatedResult.config.since);
      const updatedUntil = updatedResult.until || (updatedResult.config && updatedResult.config.until);  
      const updatedStream = updatedResult.stream || (updatedResult.config && updatedResult.config.stream);
      
      console.log('  Values in updated result:');
      console.log('    Since:', updatedSince || 'NOT FOUND');
      console.log('    Until:', updatedUntil || 'NOT FOUND');
      console.log('    Stream:', updatedStream || 'NOT FOUND');
    }

    // Add a small delay to allow the API to fully process the update
    console.log('⏳ [DEBUG] Waiting 2 seconds for config update to propagate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('🔄 [DEBUG] Config update propagation wait completed');

    return {
      success: true,
      message: "Configuration updated successfully",
      currentConfig,
      updatedConfig: updatedResult
    };
  } catch (error) {
    console.error('❌ [DEBUG] Config Update Error:');
    console.error('  Customer ID:', customerId);
    console.error('  Collector ID:', collectorId);
    console.error('  Error Details:', error);
    console.error('  Error Message:', error instanceof Error ? error.message : String(error));
    console.error(`Error updating collector config for ${collectorId}:`, error);
    throw error;
  }
}

// Helper function to extract string values from message body
function extractStringValue(obj: any, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;

  // First, try direct key matches (case-insensitive)
  for (const key of keys) {
    // Try exact match
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      const value = obj[key];
      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'number') {
        return String(value);
      }
    }
    
    // Try case-insensitive match
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== '') {
      const value = obj[foundKey];
      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'number') {
        return String(value);
      }
    }
  }

  // Then, try nested object search (depth-first)
  for (const [objKey, objValue] of Object.entries(obj)) {
    if (typeof objValue === 'object' && objValue !== null && !Array.isArray(objValue)) {
      const nestedResult = extractStringValue(objValue, keys);
      if (nestedResult) return nestedResult;
    }
  }
  
  // Finally, search in arrays
  for (const [objKey, objValue] of Object.entries(obj)) {
    if (Array.isArray(objValue)) {
      for (const arrayItem of objValue) {
        if (typeof arrayItem === 'object' && arrayItem !== null) {
          const arrayResult = extractStringValue(arrayItem, keys);
          if (arrayResult) return arrayResult;
        }
      }
    }
  }

  return undefined;
}

// Helper function to extract dates from string content
function extractDateFromString(str: string, keys: string[]): string | undefined {
  if (!str || typeof str !== 'string') return undefined;
  
  for (const key of keys) {
    // Look for patterns like "since":"2024-01-01" or "since": "2024-01-01"
    const patterns = [
      new RegExp(`"${key}"\s*:\s*"([^"]+)"`, 'i'),
      new RegExp(`'${key}'\s*:\s*'([^']+)'`, 'i'),
      new RegExp(`${key}\s*[=:]\s*([\w\-\+:]+)`, 'i'),
      new RegExp(`"${key}"\s*:\s*([\w\-\+:]+)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = str.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  
  return undefined;
}

// Helper function to extract date values from message body
function extractDateValue(obj: any, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;

  // First, try direct key matches (case-insensitive)
  for (const key of keys) {
    // Try exact match
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      const value = obj[key];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
    
    // Try case-insensitive match
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== '') {
      const value = obj[foundKey];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
  }

  // Then, try nested object search (depth-first)
  for (const [objKey, objValue] of Object.entries(obj)) {
    if (typeof objValue === 'object' && objValue !== null && !Array.isArray(objValue)) {
      const nestedResult = extractDateValue(objValue, keys);
      if (nestedResult) return nestedResult;
    }
  }
  
  // Finally, search in arrays
  for (const [objKey, objValue] of Object.entries(obj)) {
    if (Array.isArray(objValue)) {
      for (const arrayItem of objValue) {
        if (typeof arrayItem === 'object' && arrayItem !== null) {
          const arrayResult = extractDateValue(arrayItem, keys);
          if (arrayResult) return arrayResult;
        }
      }
    }
  }

  return undefined;
}