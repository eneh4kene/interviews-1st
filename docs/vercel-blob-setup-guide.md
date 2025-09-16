# Vercel Blob Setup Guide

## Overview

This guide explains how to set up and test Vercel Blob for your resume file system, including local testing with the actual Vercel Blob service.

## 1. Understanding Vercel Blob Architecture

### **Service Separation**
- **Vercel App**: Your Next.js application (hosted on Vercel)
- **Vercel Blob**: Separate file storage service (like AWS S3)
- **Connection**: Your app calls Vercel Blob API using tokens

### **Data Flow**
```
Local Development → Vercel Blob API → Blob Storage
Production App → Vercel Blob API → Blob Storage
n8n Workflow → Blob URL → Direct Download
```

## 2. Configuration Steps

### **Step 1: Get Vercel Blob Token**

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Go to: Project → Storage → Blob
   - Click "Create Database" (if not exists)

3. **Generate Token**
   - Go to: Settings → Environment Variables
   - Add: `BLOB_READ_WRITE_TOKEN`
   - Generate token and copy it

### **Step 2: Configure Environment Variables**

#### **For Local Development (.env in root directory)**
```bash
# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_your_token_here"

# App Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Your existing variables
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
SENDGRID_API_KEY=your_sendgrid_api_key
```

#### **For Production (Vercel Dashboard)**
```bash
# In Vercel Dashboard → Environment Variables
BLOB_READ_WRITE_TOKEN=your_token_here
NEXT_PUBLIC_API_BASE_URL=https://interviewsfirst.com
```

### **Step 3: Test Locally with Real Vercel Blob**

#### **Option A: Use Real Vercel Blob (Recommended)**
```bash
# 1. Set up .env.local with your token
# 2. Run the test script
node scripts/test-vercel-blob-local.js

# 3. Start your development server
npm run dev
```

#### **Option B: Hybrid Approach (Current Implementation)**
- **Development**: Uses local files + Vercel Blob
- **Production**: Uses Vercel Blob only
- **Benefits**: Easy testing, production-ready

## 3. Testing Scenarios

### **Local Testing with Real Vercel Blob**

1. **Upload Test**
   ```bash
   # Test file upload via API
   curl -X POST http://localhost:3000/api/resumes \
     -H "Authorization: Bearer your_jwt_token" \
     -F "file=@test-resume.pdf" \
     -F "clientId=your_client_id"
   ```

2. **Download Test**
   ```bash
   # Test file download
   curl -I "http://localhost:3000/api/resumes/123/download"
   # Should redirect to Vercel Blob URL
   ```

3. **n8n Compatibility Test**
   ```bash
   # Test direct blob URL access
   curl -I "https://blob.vercel-storage.com/resumes/resume-123.pdf"
   ```

### **Production Testing**

1. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

2. **Test Production URLs**
   ```bash
   # Test production download
   curl -I "https://interviewsfirst.com/api/resumes/123/download"
   ```

3. **Verify Blob URLs**
   - Check that URLs redirect to `blob.vercel-storage.com`
   - Verify files are accessible

## 4. Migration Process

### **For Existing Files**

1. **Run Migration Script**
   ```bash
   # Set environment variables
   export BLOB_READ_WRITE_TOKEN=your_token
   export DATABASE_URL=your_database_url

   # Run migration
   node scripts/migrate-resumes-to-vercel-blob.js
   ```

2. **Verify Migration**
   ```bash
   # Check database
   psql -d your_db -c "SELECT id, name, file_url FROM resumes LIMIT 5;"
   ```

### **For New Files**
- New uploads automatically use Vercel Blob
- No migration needed

## 5. Troubleshooting

### **Common Issues**

#### **"BLOB_READ_WRITE_TOKEN not found"**
```bash
# Solution: Set environment variable
export BLOB_READ_WRITE_TOKEN=your_token_here
# Or add to .env.local file
```

#### **"File not found" in development**
```bash
# Check if local file exists
ls -la apps/web/uploads/resumes/
# Check database file_url
psql -d your_db -c "SELECT file_url FROM resumes WHERE id = 'your_id';"
```

#### **"Access denied" in production**
```bash
# Check token permissions
# Verify token is set in Vercel Dashboard
# Check if token has expired
```

### **Debug Commands**

```bash
# Test Vercel Blob connection
node scripts/test-vercel-blob-local.js

# Test file URLs
node scripts/test-file-urls.js

# Check environment variables
echo $BLOB_READ_WRITE_TOKEN

# Test API endpoints
curl -I "http://localhost:3000/api/health"
```

## 6. Production Deployment

### **Vercel Configuration**

1. **Environment Variables**
   - Set `BLOB_READ_WRITE_TOKEN` in Vercel Dashboard
   - Set `NEXT_PUBLIC_API_BASE_URL=https://interviewsfirst.com`

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Verify**
   - Check that files upload to Vercel Blob
   - Verify download URLs work
   - Test n8n integration

### **Monitoring**

1. **Vercel Dashboard**
   - Monitor blob storage usage
   - Check API call logs
   - Monitor error rates

2. **Application Logs**
   - Check upload success rates
   - Monitor download redirects
   - Track error conditions

## 7. Cost Considerations

### **Vercel Blob Pricing**
- **Free Tier**: 1GB storage, 1GB bandwidth/month
- **Pro Tier**: $0.15/GB storage, $0.40/GB bandwidth
- **Enterprise**: Custom pricing

### **Optimization Tips**
- Compress files before upload
- Use appropriate file formats
- Monitor usage regularly

## 8. Security Considerations

### **Public Access**
- Vercel Blob files are publicly accessible
- URLs are not easily guessable
- Consider adding authentication if needed

### **Best Practices**
- Use unique filenames
- Implement file validation
- Monitor access patterns
- Consider virus scanning

## 9. Next Steps

1. **Set up Vercel Blob token**
2. **Test locally with real service**
3. **Run migration for existing files**
4. **Deploy to production**
5. **Test n8n integration**
6. **Monitor and optimize**

## Conclusion

Vercel Blob is a separate service that provides reliable file storage for your Vercel-hosted applications. You can test it locally with the real service, and it integrates seamlessly with n8n workflows. The setup is straightforward, and the service scales automatically with your needs.
