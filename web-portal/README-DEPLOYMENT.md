# Web Portal Deployment Guide

## Deploying to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier: https://vercel.com/signup)
- Git repository pushed to GitHub

---

### Method 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "feat(web-portal): Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your `vietjusticia` repository
   - **Root Directory:** Set to `web-portal`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Configure Environment Variables:**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add:
     - **Name:** `VITE_API_URL`
     - **Value:** `https://npqace-vietjusticia-backend.hf.space`
     - **Environment:** Production, Preview, Development

4. **Deploy:**
   - Click "Deploy"
   - Wait 1-2 minutes for build to complete
   - Your app will be live at: `https://your-project-name.vercel.app`

---

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd web-portal
   vercel --prod
   ```

4. **When prompted:**
   - Set up and deploy: **Y**
   - Which scope: Select your account
   - Link to existing project: **N**
   - Project name: `vietjusticia-web-portal` (or your choice)
   - In which directory: `./` (current directory)
   - Override settings: **N**

5. **Add environment variable:**
   ```bash
   vercel env add VITE_API_URL production
   # Paste: https://npqace-vietjusticia-backend.hf.space
   ```

6. **Redeploy with env vars:**
   ```bash
   vercel --prod
   ```

---

### After Deployment

#### 1. Update CORS in Backend
Your backend needs to allow requests from Vercel domain:

**File:** `backend/app/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://your-project-name.vercel.app",  # Add your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Deploy backend changes to HuggingFace:**
```bash
git add backend/app/main.py
git commit -m "fix(backend): Add Vercel domain to CORS"
git push origin main
```

#### 2. Test WebSocket Connection
- Vercel automatically proxies WebSocket connections
- Test your real-time chat feature after deployment

#### 3. Custom Domain (Optional)
- In Vercel dashboard: Settings → Domains
- Add your custom domain (e.g., `portal.vietjusticia.com`)
- Update DNS records as instructed

---

## Deploying to Netlify (Alternative)

### Via Netlify Dashboard

1. **Push to GitHub** (same as Vercel)

2. **Import to Netlify:**
   - Go to https://app.netlify.com/start
   - Click "Import from Git" → GitHub
   - Select repository
   - **Base directory:** `web-portal`
   - **Build command:** `npm run build`
   - **Publish directory:** `web-portal/dist`

3. **Environment Variables:**
   - Site settings → Environment variables
   - Add `VITE_API_URL=https://npqace-vietjusticia-backend.hf.space`

4. **Deploy site**

---

## Local Production Build Test

Before deploying, test production build locally:

```bash
cd web-portal

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit http://localhost:4173 to test production build.

---

## Troubleshooting

### Build Fails on Vercel/Netlify

**Error:** `Module not found` or `Cannot find module`
- **Solution:** Check `package.json` dependencies, run `npm install` locally

**Error:** TypeScript errors
- **Solution:** Run `npm run build` locally to find issues, fix TypeScript errors

### API Requests Fail (CORS Error)

**Error:** `Access-Control-Allow-Origin` header missing
- **Solution:** Update backend CORS settings (see "After Deployment" section)

### WebSocket Not Working

**Error:** WebSocket connection fails
- **Solution:**
  1. Ensure backend WebSocket endpoint uses wss:// (secure WebSocket)
  2. Check HuggingFace Spaces WebSocket support

### Environment Variables Not Loading

**Error:** `VITE_API_URL` is undefined
- **Solution:**
  1. Ensure variable name starts with `VITE_`
  2. Redeploy after adding env vars
  3. Clear Vercel/Netlify cache and redeploy

---

## Continuous Deployment

Once set up, Vercel/Netlify auto-deploys on every push to main branch:

```bash
git add .
git commit -m "feat: Add new feature"
git push origin main
# Vercel automatically builds and deploys
```

---

## Monitoring & Analytics

### Vercel Analytics
- Enable in Vercel dashboard: Settings → Analytics
- Track page views, performance metrics

### Custom Monitoring
Consider adding:
- **Sentry** for error tracking
- **Google Analytics** for user analytics

---

## Cost Estimation

### Vercel Free Tier
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ 100 GB-hours of build time

**Typical usage:** VietJusticIA web-portal will stay comfortably within free tier limits.

---

## Security Checklist

- [x] HTTPS enabled (automatic on Vercel/Netlify)
- [x] Security headers configured (vercel.json)
- [ ] Update backend CORS to whitelist Vercel domain
- [ ] Environment variables stored securely (not in git)
- [ ] API authentication via JWT tokens

---

## Additional Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vite Deployment Guide:** https://vitejs.dev/guide/static-deploy.html
- **React Router on Vercel:** https://vercel.com/guides/deploying-react-with-vercel

---

**Last Updated:** 2025-11-10
**Deployment Target:** Vercel (Production)
