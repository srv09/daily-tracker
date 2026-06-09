import { NextRequest, NextResponse } from "next/server";
import { listReports, getReport, storeReport } from "@/lib/storage";

function authorized(req: NextRequest): boolean {
  const secret = process.env.REPORTS_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-reports-secret") === secret;
}

// GET /api/reports?date=YYYY-MM-DD  → single report
// GET /api/reports                   → list of dates
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (date) {
    const report = await getReport(date);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ date, report });
  }

  const dates = await listReports();
  return NextResponse.json({ dates });
}

// POST /api/reports  { date: "YYYY-MM-DD", report: "markdown" }
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, report } = body ?? {};

  if (!date || !report || typeof date !== "string" || typeof report !== "string") {
    return NextResponse.json({ error: "date and report are required" }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  await storeReport(date, report);
  return NextResponse.json({ ok: true, date });
}
