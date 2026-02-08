# Vercel Deployment Guide

Deploy the Next.js frontend to Vercel with environment variables for the agent backend.

---

## Quick Setup

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from the web app directory:**
   ```bash
   cd apps/web
   vercel
   ```

3. **Set environment variables** in Vercel dashboard or CLI:
   ```bash
   vercel env add DATABASE_URL
   vercel env add AGENT_URL  # e.g., https://agent.bills.bio
   ```

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

---

## GitHub Integration

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `apps/web`
4. Add environment variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `AGENT_URL` — Backend agent URL (https://agent.bills.bio)
   - Any other required env vars from `.env.example`
5. Click **Deploy**

Vercel will automatically deploy on every push to `main`.

---

## Environment Variables Required

See `apps/web/.env.example` for the full list:

```bash
# Database
DATABASE_URL=postgresql://...

# Agent backend
AGENT_URL=https://agent.bills.bio

# Analytics (if using)
NEXT_PUBLIC_GA_ID=...

# Auth (if using)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

---

## Custom Domain

1. In Vercel dashboard: **Settings → Domains**
2. Add your domain (e.g., `bills.bio`, `www.bills.bio`)
3. Follow DNS instructions (usually CNAME to `cname.vercel-dns.com`)

---

## Benefits of Vercel

- ✅ Zero configuration for Next.js
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments on git push
- ✅ Preview deployments for PRs
- ✅ Server-side rendering + API routes work out of the box
- ✅ Free tier available

---

## Alternative: Keep AWS but add Next.js server

If you want to stay on AWS:

1. Deploy Next.js to EC2 with Node.js or use AWS Amplify
2. Update CloudFront to proxy all `/api/*` (not just `/api/chat*`) to the Next.js server
3. Serve static assets from CloudFront cache

This is more complex than Vercel but gives you full control.
