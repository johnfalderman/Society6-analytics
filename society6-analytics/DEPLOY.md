# Society6 GA4 Analytics Dashboard — Netlify Deployment

## What this is
A live GA4 analytics dashboard that pulls real data from your Society6 Google Analytics property. 
Built on Netlify with a serverless function handling Google authentication securely.

## Project Structure
```
society6-analytics/
├── netlify.toml              # Netlify config
├── package.json              # Dependencies
├── public/
│   └── index.html            # The dashboard frontend
└── netlify/
    └── functions/
        └── ga4.js            # Serverless function (handles Google auth)
```

## Deployment Steps

### 1. Push to GitHub
Create a new GitHub repo and push this folder:
```bash
cd society6-analytics
git init
git add .
git commit -m "Society6 GA4 dashboard"
git remote add origin https://github.com/YOUR_USERNAME/society6-analytics.git
git push -u origin main
```

### 2. Connect to Netlify
1. Go to app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account and select the repo
4. Build settings are auto-detected from netlify.toml
5. Click "Deploy site"

### 3. Add Environment Variables (CRITICAL)
In Netlify: Site Settings → Environment Variables → Add these:

| Key | Value |
|-----|-------|
| GA_PROJECT_ID | society-6-analytics |
| GA_PRIVATE_KEY_ID | 9f2a099b2ebdf16b4ebb418ad953dd443158b2f8 |
| GA_PRIVATE_KEY | (paste the full private key from your JSON file, including -----BEGIN/END PRIVATE KEY-----) |
| GA_CLIENT_EMAIL | ga4-reader@society-6-analytics.iam.gserviceaccount.com |
| GA_CLIENT_ID | 116471634040845878725 |
| GA_PROPERTY_ID | 252743698 |

### 4. Redeploy
After adding environment variables, trigger a redeploy:
Deploys tab → "Trigger deploy" → "Deploy site"

### 5. Visit your dashboard
Your dashboard will be live at: https://[your-site-name].netlify.app

## Dashboard Features
- **6 KPI cards**: Sessions, Active Users, Conversions, Revenue, Bounce Rate, Avg Session Duration
- **Period-over-period deltas**: Each KPI shows % change vs prior period
- **Sessions/Users over time chart**: Line chart with selectable date ranges
- **Channel breakdown**: Doughnut chart + table with users, conversions, revenue per channel
- **Top pages table**: With mini bar charts and bounce rate
- **Date ranges**: 7D / 30D / 90D toggle
- **Live refresh**: Click the status badge to refresh all data

## Security Notes
- Your private key lives only in Netlify's encrypted environment variables
- The frontend never sees the credentials
- The serverless function authenticates on every request
- The service account has read-only (Viewer) access to GA4
