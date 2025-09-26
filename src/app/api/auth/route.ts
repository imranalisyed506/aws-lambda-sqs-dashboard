import { NextRequest, NextResponse } from "next/server";
import { logMessage } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.US_URL_PROD;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "API configuration missing" },
        { status: 500 }
      );
    }

    logMessage("info", "API: Authenticating user", { username });

    const authUrl = `${baseUrl}/aims/v1/authenticate`;
    const authHeader = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logMessage("error", "API: Authentication failed", { status: response.status });
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: response.status }
      );
    }

    const authData = await response.json();
    const token = authData?.authentication?.token;

    if (!token) {
      return NextResponse.json(
        { error: "Invalid authentication response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token,
      success: true,
      message: "Authentication successful"
    });

  } catch (error) {
    logMessage("error", "API: Authentication error", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}