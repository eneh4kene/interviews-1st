# 🚀 Deployment Guide: GitHub Container Registry + Railway

This guide walks you through deploying your Interview Me application to production using GitHub Container Registry (GHCR) and Railway.

## 📋 Prerequisites

- GitHub repository with Docker images
- Railway account
- Environment variables configured

## 🔧 Step 1: GitHub Container Registry Setup

### 1.1 Enable GitHub Actions
The workflow is already configured in `.github/workflows/docker-build.yml`. It will:
- Build both API and Web Docker images
- Push them to `ghcr.io/eneh4kene/interview-me-api` and `ghcr.io/eneh4kene/interview-me-web`
- Use GitHub's built-in `GITHUB_TOKEN` for authentication

### 1.2 Trigger the Build
```bash
# Push to master branch to trigger the build
git push origin master
```

### 1.3 Verify Images
Check your GitHub repository → Packages to see the published images.

## 🚂 Step 2: Railway Deployment

### 2.1 Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `interview-me` repository

### 2.2 Configure Services

#### API Service Configuration:
- **Name**: `interview-me-api`
- **Source**: GitHub Container Registry
- **Image**: `ghcr.io/eneh4kene/interview-me-api:latest`
- **Port**: `3001`

#### Web Service Configuration:
- **Name**: `interview-me-web`  
- **Source**: GitHub Container Registry
- **Image**: `ghcr.io/eneh4kene/interview-me-web:latest`
- **Port**: `3000`

### 2.3 Environment Variables

Set these environment variables in Railway dashboard:

#### Required Variables:
```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_pi8PbIqt5WSD@ep-purple-silence-ad2u8w9w-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Redis (Railway provides this)
REDIS_URL=redis://redis:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Job APIs
ADZUNA_APP_ID=00287061
ADZUNA_APP_KEY=your-adzuna-key
JOOBLE_API_KEY=your-jooble-key

# Web App
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.railway.app
```

#### Optional Variables:
```bash
# N8N Integration
N8N_AI_APPLY_WEBHOOK_URL=https://your-n8n-instance.com/webhook/ai-apply
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin

# Rate Limiting
AUTH_RATE_LIMIT_DISABLED=false
```

## 🔄 Step 3: Continuous Deployment

### 3.1 Automatic Deployments
- Every push to `master` triggers GitHub Actions
- New images are automatically built and pushed to GHCR
- Railway can be configured to auto-deploy from GHCR

### 3.2 Manual Deployment
```bash
# Update Railway to use latest image
railway up --detach
```

## 🌐 Step 4: Domain Configuration

### 4.1 Custom Domains
1. In Railway dashboard, go to your service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update `NEXT_PUBLIC_API_BASE_URL` to match

### 4.2 CORS Configuration
Update your API's CORS settings for production domains:
```typescript
// In apps/api/src/index.ts
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com', 'https://your-api-domain.railway.app']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
```

## 📊 Step 5: Monitoring & Health Checks

### 5.1 Health Endpoints
- **API Health**: `https://your-api-domain.railway.app/health`
- **Web Health**: `https://your-web-domain.railway.app`

### 5.2 Railway Monitoring
- View logs in Railway dashboard
- Monitor resource usage
- Set up alerts for failures

## 🔧 Step 6: Database & Redis

### 6.1 Database
- Your Neon database is already configured
- No additional setup needed

### 6.2 Redis
- Railway provides managed Redis
- Use the `REDIS_URL` provided by Railway

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Check `NEXT_PUBLIC_API_BASE_URL` matches your API domain
   - Verify CORS origins include your web domain

2. **Database Connection**
   - Ensure `DATABASE_URL` is correctly set
   - Check Neon database is accessible

3. **Image Pull Errors**
   - Verify images exist in GHCR
   - Check Railway has access to your GitHub packages

4. **Build Failures**
   - Check GitHub Actions logs
   - Verify Dockerfile paths are correct

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string (provided by Railway) |
| `JWT_SECRET` | ✅ | Secret key for JWT tokens |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Public API URL for web app |
| `ADZUNA_APP_ID` | ✅ | Adzuna API app ID |
| `ADZUNA_APP_KEY` | ✅ | Adzuna API key |
| `JOOBLE_API_KEY` | ✅ | Jooble API key |
| `STRIPE_SECRET_KEY` | ❌ | Stripe secret key (if using payments) |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Stripe webhook secret (if using payments) |

## 🎉 Success!

Once deployed, your application will be available at:
- **Web App**: `https://your-web-domain.railway.app`
- **API**: `https://your-api-domain.railway.app`

The application will automatically update when you push changes to the `master` branch!