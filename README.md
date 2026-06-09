# Daily Tracker

Watches daily laptop activity and generates AI-powered bullet-point reports.

## Projects

### `activity-tracker/`
Python background daemon that logs active app + window title every 60 seconds.
Generates a daily report at 8:30 PM using Claude AI.

**Setup:**
```bash
cd activity-tracker
cp .env.example .env        # add ANTHROPIC_API_KEY
bash setup.sh               # installs launchd agents
```

**Generate a report manually:**
```bash
python3 activity-tracker/reporter.py
python3 activity-tracker/reporter.py --yesterday
```

### `daily-reports-viewer/`
Next.js web app to browse reports. Deployed to Vercel.

**Local dev:**
```bash
cd daily-reports-viewer
cp .env.local.example .env.local
npm install && npm run dev
```

**After deploying to Vercel**, add to `activity-tracker/.env`:
```
REPORTS_API_URL=https://your-app.vercel.app
REPORTS_API_SECRET=your-secret
```
The reporter will then sync each report to the web viewer automatically.

## CI/CD

Push to `main` → GitHub Actions → Vercel production deploy.

**Required GitHub Secrets:**
- `VERCEL_TOKEN` — from vercel.com/account/tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after `vercel link`
- `VERCEL_PROJECT_ID` — from `.vercel/project.json` after `vercel link`
