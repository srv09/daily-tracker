/**
 * Storage: Vercel Blob in production, local filesystem in dev.
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;
const REPORTS_DIR = process.env.REPORTS_DIR ?? path.join(os.homedir(), "daily-reports");

// ── Blob helpers ───────────────────────────────────────────────────────────────

async function blobList(): Promise<string[]> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: "reports/" });
  return blobs
    .map((b) => b.pathname.replace("reports/", "").replace(".json", ""))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort((a, b) => b.localeCompare(a));
}

async function blobGet(date: string): Promise<string | null> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: `reports/${date}.json` });
  const blob = blobs.find((b) => b.pathname === `reports/${date}.json`);
  if (!blob) return null;
  const res = await fetch(blob.url);
  return res.ok ? res.text() : null;
}

async function blobPut(date: string, content: string): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(`reports/${date}.json`, content, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/plain",
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function listReports(): Promise<string[]> {
  if (IS_VERCEL) return blobList();
  try {
    const files = await fs.readdir(REPORTS_DIR);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""))
      .sort((a, b) => b.localeCompare(a));
  } catch { return []; }
}

export async function getReport(date: string): Promise<string | null> {
  if (IS_VERCEL) return blobGet(date);
  try {
    return await fs.readFile(path.join(REPORTS_DIR, `${date}.md`), "utf-8");
  } catch { return null; }
}

export async function storeReport(date: string, content: string): Promise<void> {
  if (IS_VERCEL) { await blobPut(date, content); return; }
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, `${date}.md`), content, "utf-8");
}
