import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { LambdaClient, ListFunctionsCommand, GetFunctionConfigurationCommand, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import { fromIni } from "@aws-sdk/credential-providers";

// Default profiles, but allow override via function params
const DEFAULT_PROFILE_LAMBDA = "paws_integration";
const DEFAULT_PROFILE_S3 = "playground";
const REGION = "us-east-1";
const S3_BUCKET = "rcs-alertlogic-collectors-us-east-1";
const S3_PREFIX = "packages/lambda/";

export async function listS3ZipFiles(profileS3?: string) {
  const s3 = new S3Client({ region: REGION, credentials: fromIni({ profile: profileS3 || DEFAULT_PROFILE_S3 }) });
  const command = new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: S3_PREFIX });
  const result = await s3.send(command);
  return (result.Contents || [])
    .map((obj: { Key?: string }) => obj.Key)
    .filter((key: string | undefined) => key && /^packages\/lambda\/al-.*\.zip$/.test(key));
}

// Get Lambda functions with specific descriptions and their aws_lambda_zipfile_name env var
export async function listTargetLambdasWithZipfileName(profileLambda?: string) {
  const lambda = new LambdaClient({ region: REGION, credentials: fromIni({ profile: profileLambda || DEFAULT_PROFILE_LAMBDA }) });
  const command = new ListFunctionsCommand({});
  const result = await lambda.send(command);
  const functions = (result.Functions || []).filter(fn =>
    fn.Description?.includes("Alert Logic Poll based collector") ||
    fn.Description?.includes("Alert Logic S3 collector")
  );

  // For each function, get its aws_lambda_zipfile_name env var
  const detailed = await Promise.all(functions.map(async fn => {
    let zipfileName = undefined;
    try {
      const config = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: fn.FunctionName }));
      zipfileName = config.Environment?.Variables?.aws_lambda_zipfile_name;
    } catch (e) {
      // ignore errors, leave zipfileName undefined
    }
    return {
      functionName: fn.FunctionName,
      description: fn.Description,
      zipfileName,
    };
  }));
  return detailed;
}

export async function updateLambdaWithZip(functionName: string, zipFile: string, profileLambda?: string) {
  const lambda = new LambdaClient({ region: REGION, credentials: fromIni({ profile: profileLambda || DEFAULT_PROFILE_LAMBDA }) });
  const command = new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    S3Bucket: S3_BUCKET,
    S3Key: zipFile,
    Publish: true
  });
  await lambda.send(command);
  return `Update command executed for ${functionName} with ${zipFile}`;
}
