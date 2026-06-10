/**
 * Storage layer:
 *   - GitHub raw content (production on Vercel) — no token needed, repo is public
 *   - Local ~/daily-reports/ filesystem (local dev)
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";

const IS_VERCEL = !!process.env.VERCEL;
const GITHUB_REPO = "srv09/daily-tracker";
const GITHUB_BRANCH = "main";
const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}`;
const REPORTS_DIR = process.env.REPORTS_DIR ?? path.join(os.homedir(), "daily-reports");

// ── GitHub helpers ─────────────────────────────────────────────────────────────

async function githubList(): Promise<string[]> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/reports`, {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 60 },
    } as RequestInit);
    if (!res.ok) return [];
    const files: { name: string }[] = await res.json();
    return files
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => f.name.replace(".json", ""))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

async function githubGet(date: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_RAW}/reports/${date}.json`, {
      next: { revalidate: 60 },
    } as RequestInit);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function listReports(): Promise<string[]> {
  if (IS_VERCEL) return githubList();
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
  if (IS_VERCEL) return githubGet(date);
  try {
    return await fs.readFile(path.join(REPORTS_DIR, `${date}.md`), "utf-8");
  } catch {
    return null;
  }
}

export async function storeReport(date: string, content: string): Promise<void> {
  // On Vercel: reporter pushes to GitHub directly — nothing to do here
  if (IS_VERCEL) return;
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, `${date}.md`), content, "utf-8");
}
