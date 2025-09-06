# 🚀 InterviewsFirst Deployment Guide

## Option 1: Vercel + Railway Deployment

### **Architecture:**
- **Frontend (Next.js)**: Vercel (FREE)
- **Backend (API)**: Railway (FREE - $5 credit monthly)
- **Database**: Neon PostgreSQL (FREE - you already have this)
- **Cache**: Railway Redis (FREE)

---

## **Step 1: Deploy Backend to Railway**

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub account

### 1.2 Deploy API
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `interview-me` repository
4. **Keep the root directory as the default** (don't change to `apps/api`)
5. Railway will use the `railway.json` configuration file
6. The build process will handle the monorepo structure automatically

### 1.3 Configure Environment Variables in Railway
Set these in Railway dashboard → Variables:

```bash
# Database (your existing Neon URL)
DATABASE_URL=your_neon_database_url_here

# JWT Secrets (generate new ones for production)
JWT_SECRET=your_production_jwt_secret_here
JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_here

# Redis (Railway will provide this automatically)
REDIS_URL=redis://default:password@redis.railway.internal:6379

# Environment
NODE_ENV=production
PORT=3001

# CORS (will be updated after Vercel deployment)
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### 1.4 Add Redis Service
1. In Railway project dashboard
2. Click "New" → "Database" → "Add Redis"
3. Railway will automatically set `REDIS_URL`

---

## **Step 2: Deploy Frontend to Vercel**

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Connect your GitHub account

### 2.2 Deploy Next.js App
1. Click "New Project"
2. Import your `interview-me` repository
3. Set **Root Directory** to `apps/web`
4. Vercel will auto-detect Next.js

### 2.3 Configure Environment Variables in Vercel
Set these in Vercel dashboard → Settings → Environment Variables:

```bash
# API URL (from Railway deployment)
NEXT_PUBLIC_API_URL=https://your-railway-api-url.railway.app

# No other variables needed for frontend
```

---

## **Step 3: Update CORS Configuration**

### 3.1 Get Your Vercel URL
After Vercel deployment, you'll get a URL like:
`https://interview-me-abc123.vercel.app`

### 3.2 Update Railway CORS
In Railway dashboard → Variables, update:
```bash
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

---

## **Step 4: Test Your Deployment**

### 4.1 Test API
```bash
curl https://your-railway-api-url.railway.app/health
```

### 4.2 Test Frontend
Visit your Vercel URL and test:
- Login functionality
- Dashboard access
- All features working

---

## **Step 5: Custom Domain (Optional)**

### 5.1 Vercel Custom Domain
1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 5.2 Update API CORS
Update Railway CORS to include your custom domain:
```bash
CORS_ORIGIN=https://yourdomain.com,https://your-vercel-app.vercel.app
```

---

## **Cost Breakdown:**
- **Vercel**: FREE (100GB bandwidth, unlimited projects)
- **Railway**: FREE ($5 credit monthly - covers small apps)
- **Neon**: FREE (you already have this)
- **Total**: $0/month

---

## **Troubleshooting:**

### Common Issues:
1. **CORS errors**: Update `CORS_ORIGIN` in Railway
2. **Database connection**: Verify `DATABASE_URL` in Railway
3. **Redis connection**: Railway auto-provides `REDIS_URL`
4. **Build errors**: Check Railway logs for API issues

### Support:
- Railway: [Discord](https://discord.gg/railway)
- Vercel: [Documentation](https://vercel.com/docs)

---

## **Next Steps After Deployment:**
1. Set up monitoring
2. Configure backups
3. Set up CI/CD
4. Add custom domain
5. Scale as needed
