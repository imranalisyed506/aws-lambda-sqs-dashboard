import { NextRequest, NextResponse } from "next/server";

import { SQSClient, ReceiveMessageCommand, Message } from "@aws-sdk/client-sqs";
import { fromIni } from "@aws-sdk/credential-providers";

export async function POST(request: NextRequest) {
  const { profile, region, queueUrl } = await request.json();
  if (!queueUrl) return NextResponse.json({ error: "Missing queueUrl" }, { status: 400 });
  const credentials = fromIni({ profile });
  const client = new SQSClient({ region, credentials });
  const start = Date.now();
  const maxMs = 5 * 60 * 1000; // 5 minutes
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
    while (Date.now() - start < maxMs && !aborted) {
      const receiveCmd = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // max allowed by SQS
        VisibilityTimeout: 10,
        MessageAttributeNames: ["All"],
        AttributeNames: ["All"],
      });
      try {
        // Race polling and abort
        const result = await Promise.race([
          client.send(receiveCmd),
          abortPromise.then(() => null)
        ]);
        if (aborted) break;
        if (result && result.Messages && result.Messages.length > 0) {
          messages = messages.concat(result.Messages);
        }
      } catch (err: any) {
        lastError = err;
        break;
      }
    }
    return NextResponse.json({ messages, aborted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

