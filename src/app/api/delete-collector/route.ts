import { NextRequest, NextResponse } from "next/server";
import { logMessage } from "@/lib/utils";

export async function DELETE(req: NextRequest) {
  try {
    const { customerId, collectorId, token } = await req.json();
    
    if (!customerId || !collectorId || !token) {
      return NextResponse.json(
        { error: "Customer ID, collector ID, and token are required" },
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

    logMessage("info", "API: Deleting collector", { customerId, collectorId });
    console.log("info", "API: Deleting collector", { customerId, collectorId });
    const deleteUrl = `${baseUrl}/applications/v1/${customerId}/collectors/${collectorId}`;
    logMessage("info", "API: Deleting collector deleteUrl", { deleteUrl });
    console.log("info", "API: Deleting collector deleteUrl", { deleteUrl });

    const headers = {
      'x-aims-auth-token': token,
      'Content-Type': 'application/json'
    };

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      logMessage("error", "API: Failed to delete collector", { 
        status: response.status, 
        error: errorText,
        customerId,
        collectorId 
      });
      return NextResponse.json(
        { 
          error: `Failed to delete collector: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    logMessage("info", "API: Successfully deleted collector", { customerId, collectorId });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted collector ${collectorId} for customer ${customerId}`,
      customerId,
      collectorId
    });

  } catch (error) {
    logMessage("error", "API: Error deleting collector", error);
    return NextResponse.json(
      { error: "Failed to delete collector" },
      { status: 500 }
    );
  }
}