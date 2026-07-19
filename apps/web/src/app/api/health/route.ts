import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "observal-web",
    version: process.env.npm_package_version ?? "0.2.0",
    timestamp: new Date().toISOString(),
  });
}
