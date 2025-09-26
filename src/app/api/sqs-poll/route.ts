import { NextRequest, NextResponse } from "next/server";
import { ReceiveMessageCommand, Message, ReceiveMessageCommandOutput } from "@aws-sdk/client-sqs";
import { getSqsClient, getSqsQueueStatus } from "@/lib/aws-client";

export async function POST(request: NextRequest) {
  const { profile, region, queueUrl } = await request.json();
  if (!queueUrl) return NextResponse.json({ error: "Missing queueUrl" }, { status: 400 });
  
  // Use cached, optimized SQS client
  const client = getSqsClient(profile, region);
  const start = Date.now();
  const maxMs = 300 * 1000; // Increased to 5 minutes (300 seconds) for longer polling
  let messages: Message[] = [];
  let lastError = null;

  // Support aborting via fetch signal (Next.js 13+)
  let aborted = false;
  const abortPromise = new Promise<void>((resolve) => {
    // @ts-ignore
    if (request.signal) {
      // @ts-ignore
      request.signal.addEventListener("abort", () => {
        aborted = true;
        resolve();
      });
    }
  });

  try {
    // Phase 0: Quick queue status check (now with 5s timeout and retry)
    let queueStatus = null;
    let statusError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        queueStatus = await Promise.race([
          getSqsQueueStatus(profile, region, queueUrl),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Status check timeout')), 5000)
          )
        ]);
        break; // success
      } catch (err) {
        const errorObj = err as any;
        statusError = errorObj;
        // Log error for diagnostics
        console.error(`Queue status check attempt ${attempt} failed:`, {
          error: errorObj?.message,
          stack: errorObj?.stack,
          profile,
          region,
          queueUrl,
          time: new Date().toISOString(),
        });
        if (attempt === 2) {
          // After 2 attempts, return error response
          return NextResponse.json({
            error: errorObj?.message || 'Status check failed',
            stack: errorObj?.stack,
            profile,
            region,
            queueUrl,
            time: new Date().toISOString(),
            awsError: errorObj?.code || errorObj?.name,
            awsMessage: errorObj?.message,
            strategy: 'status-check',
          }, { status: 500 });
        }
      }
    }
    // Always proceed to polling, even if no messages are found in status check
    // This allows up to 5 minutes of polling regardless of initial queue status

    // Optimized two-phase polling strategy for best performance
    let pollCount = 0;
    
    // Phase 1: Quick short poll to check for immediate messages (non-blocking)
    const quickPollCmd = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 0,              // Short polling - immediate return
      VisibilityTimeout: 30,
      MessageAttributeNames: ["All"],
      AttributeNames: ["All"],
    });
    
    try {
      const quickResult = await Promise.race([
        client.send(quickPollCmd),
        abortPromise.then(() => null as ReceiveMessageCommandOutput | null),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Quick poll timeout')), 3000)
        )
      ]);
      
      if (aborted) {
        return NextResponse.json({ messages: [], aborted: true, pollCount: 0, timeElapsed: Date.now() - start });
      }
      
      if (quickResult && quickResult.Messages && quickResult.Messages.length > 0) {
        // Found messages immediately - return them
        return NextResponse.json({ 
          messages: quickResult.Messages, 
          aborted: false, 
          pollCount: 1,
          timeElapsed: Date.now() - start,
          strategy: 'quick-poll',
          queueStatus
        });
      }
    } catch (err: any) {
      if (err.message !== 'Quick poll timeout') {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
    
    // Phase 2: Long polling if no immediate messages found
    const pollTimeoutMs = 22000; // 22s per poll
    const maxPolls = Math.ceil(maxMs / pollTimeoutMs); // Use full allowed time

    while (Date.now() - start < maxMs && !aborted && pollCount < maxPolls) {
      pollCount++;

      const receiveCmd = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,             // Full long polling
        VisibilityTimeout: 30,
        MessageAttributeNames: ["All"],
        AttributeNames: ["All"],
      });

      try {
        const pollTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Poll timeout')), pollTimeoutMs)
        );

        const result = await Promise.race([
          client.send(receiveCmd),
          abortPromise.then(() => null as ReceiveMessageCommandOutput | null),
          pollTimeout
        ]);

        if (aborted) break;

        if (result && result.Messages && result.Messages.length > 0) {
          // Accumulate all messages received during polling
          messages = messages.concat(result.Messages);
          // Continue polling for more messages until timeout or maxPolls
          // Remove break to allow full accumulation
        }

      } catch (err: any) {
        if (err.message === 'Poll timeout') {
          // Continue to next poll on timeout
          continue;
        }
        lastError = err;
        break;
      }
    }
    
    return NextResponse.json({ 
      messages, 
      aborted, 
      pollCount: pollCount + 1, // Include quick poll
      timeElapsed: Date.now() - start,
      lastError: lastError?.message,
      strategy: 'long-poll',
      queueStatus
    });
  } catch (err: any) {
    // Add more diagnostic info for troubleshooting
    let errorDetails = {
      error: err.message,
      stack: err.stack,
      profile,
      region,
      queueUrl,
      awsError: err?.code || err?.name,
      awsMessage: err?.message,
      time: new Date().toISOString(),
    };
    return NextResponse.json(errorDetails, { status: 500 });
  }
}