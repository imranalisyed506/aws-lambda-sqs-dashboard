import { NextRequest, NextResponse } from "next/server";
import { listS3ZipFiles, listTargetLambdasWithZipfileName, updateLambdaWithZip } from "@/lib/aws-zip-update";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type === "zipfiles") {
    const profileS3 = searchParams.get("profileS3") || undefined;
    const zipFiles = await listS3ZipFiles(profileS3);
    return NextResponse.json({ zipFiles });
  }
  if (type === "lambdas") {
    const profileLambda = searchParams.get("profileLambda") || undefined;
    const functions = await listTargetLambdasWithZipfileName(profileLambda);
    return NextResponse.json({ functions });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { functionName, zipFile, profileLambda } = await req.json();
  const result = await updateLambdaWithZip(functionName, zipFile, profileLambda);
  return NextResponse.json({ status: result });
}
