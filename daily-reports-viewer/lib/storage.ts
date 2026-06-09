/**
 * Storage: reads/writes ~/daily-reports/*.md
 * To deploy on Vercel, swap this module for a KV-backed implementation.
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";

const REPORTS_DIR =
  process.env.REPORTS_DIR ?? path.join(os.homedir(), "daily-reports");

export async function listReports(): Promise<string[]> {
  try {
    const files = await fs.readdir(REPORTS_DIR);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

export async function getReport(date: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(REPORTS_DIR, `${date}.md`), "utf-8");
  } catch {
    return null;
  }
}

export async function storeReport(date: string, content: string): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, `${date}.md`), content, "utf-8");
}
