import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

function parseProfiles(file: string): string[] {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const matches = [...content.matchAll(/\[(.+?)\]/g)];
    return matches.map(m => m[1].replace(/^profile /, ""));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const home = os.homedir();
  const configPath = path.join(home, ".aws", "config");
  const credPath = path.join(home, ".aws", "credentials");
  const profiles = Array.from(new Set([
    ...parseProfiles(configPath),
    ...parseProfiles(credPath),
    "default"
  ]));
  return NextResponse.json(profiles);
}
