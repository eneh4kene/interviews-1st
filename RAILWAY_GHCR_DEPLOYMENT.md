# 🚀 Railway + GHCR Deployment Guide

This guide shows how to deploy your Interview Me application using GitHub Container Registry (GHCR) and Railway.

## 📋 Prerequisites

- GitHub repository with GitHub Actions enabled
- Railway account
- Environment variables ready

## 🔧 Step 1: Build and Push Images to GHCR

### 1.1 Trigger GitHub Actions
The GitHub Actions workflow (`.github/workflows/docker-build.yml`) will automatically build and push images when you push to master.

**Check if images are being built:**
1. Go to your GitHub repository
2. Click "Actions" tab
3. Look for "Build and Push Docker Images" workflow
4. Wait for it to complete successfully

### 1.2 Verify Images in GHCR
1. Go to [GitHub Packages](https://github.com/eneh4kene/interview-me/pkgs/container)
2. You should see:
   - `interview-me-api` (API service)
   - `interview-me-web` (Web service)

## 🚂 Step 2: Deploy to Railway Using GHCR Images

### 2.1 Deploy API Service

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Click "New Project"
   - Choose "Deploy from GitHub repo"

2. **Configure API Service**
   - Select your `interview-me` repository
   - Choose "Deploy from Dockerfile"
   - Set Dockerfile path to: `apps/api/Dockerfile`
   - **OR** use the pre-built image: `ghcr.io/eneh4kene/interview-me-api:latest`

3. **Set Environment Variables**
   ```bash
   DATABASE_URL=postgresql://neondb_owner:npg_pi8PbIqt5WSD@ep-purple-silence-ad2u8w9w-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ADZUNA_APP_ID=00287061
   ADZUNA_APP_KEY=your-adzuna-key
   JOOBLE_API_KEY=your-jooble-key
   REDIS_URL=redis://redis:6379
   ```

4. **Get API Domain**
   - Once deployed, Railway will show you the API domain
   - Example: `https://interview-me-api-production-xxxx.up.railway.app`
   - **Save this domain!**

### 2.2 Deploy Web Service

1. **Create Second Service**
   - In the same Railway project, click "New Service"
   - Choose "Deploy from GitHub repo"
   - Select your `interview-me` repository

2. **Configure Web Service**
   - Choose "Deploy from Dockerfile"
   - Set Dockerfile path to: `apps/web/Dockerfile`
   - **OR** use the pre-built image: `ghcr.io/eneh4kene/interview-me-web:latest`

3. **Set Environment Variables**
   ```bash
   NODE_ENV=production
   NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.up.railway.app
   ```

4. **Get Web Domain**
   - Railway will show you the Web domain
   - Example: `https://interview-me-web-production-xxxx.up.railway.app`

## 🔄 Step 3: Update CORS Configuration

### 3.1 Update API CORS
Once you have both domains, update the API's CORS configuration:

```typescript
// In apps/api/src/index.ts
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-web-domain.up.railway.app', 'https://your-api-domain.up.railway.app']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
```

### 3.2 Redeploy API
- Commit the CORS changes
- Push to master (triggers new image build)
- Redeploy API service in Railway

## 🎯 **Using Pre-built Images (Recommended)**

### Option 1: Use GHCR Images Directly
Instead of building from source, use the pre-built images:

1. **API Service:**
   - Image: `ghcr.io/eneh4kene/interview-me-api:latest`
   - Start Command: `node dist/apps/api/src/index.js`

2. **Web Service:**
   - Image: `ghcr.io/eneh4kene/interview-me-web:latest`
   - Start Command: `npm start`

### Option 2: Use Docker Compose
Create a `docker-compose.railway.yml`:

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/eneh4kene/interview-me-api:latest
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      # ... other env vars
    ports:
      - "3001:3001"

  web:
    image: ghcr.io/eneh4kene/interview-me-web:latest
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      - api
```

## 🔍 **Benefits of Using GHCR**

1. **Faster Deployments**: No need to build from source
2. **Consistent Images**: Same image across environments
3. **Version Control**: Tag images with specific versions
4. **Reliability**: Images are pre-tested and working
5. **Rollback**: Easy to rollback to previous versions

## 🚨 **Troubleshooting**

### Common Issues:

1. **Image Not Found**
   - Check if GitHub Actions completed successfully
   - Verify image exists in GHCR
   - Check image name and tag

2. **Permission Denied**
   - Ensure Railway has access to your GitHub packages
   - Check if images are public or private

3. **CORS Errors**
   - Verify `NEXT_PUBLIC_API_BASE_URL` matches your API domain
   - Check CORS configuration includes your web domain

4. **Health Check Failures**
   - Check if the application is starting correctly
   - Verify health check endpoint exists
   - Check logs for errors

## 🎉 **Success!**

Once deployed, your application will be available at:
- **API**: `https://your-api-domain.up.railway.app`
- **Web**: `https://your-web-domain.up.railway.app`

The application will automatically update when you push changes to master (new images will be built and you can update Railway to use them).
