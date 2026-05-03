import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "supervision-system",
    timestamp: new Date().toISOString(),
  });
}