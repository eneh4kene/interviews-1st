# Vercel Blob Implementation for Resume Files

## Overview

This document outlines the complete implementation of Vercel Blob for resume file storage, replacing the local filesystem approach to ensure compatibility with Vercel deployment and n8n workflows.

## File URL Nomenclature

### **Production URLs (interviewsfirst.com)**
- **Download API**: `https://interviewsfirst.com/api/resumes/{id}/download`
- **Vercel Blob URL**: `https://blob.vercel-storage.com/resumes/resume-{timestamp}-{random}.pdf`
- **Flow**: API redirects to Vercel Blob URL

### **Development URLs (localhost)**
- **Download API**: `http://localhost:3000/api/resumes/{id}/download`
- **Local File**: `http://localhost:3000/api/resumes/{id}/download` (serves local file)
- **Vercel Blob URL**: `https://blob.vercel-storage.com/resumes/resume-{timestamp}-{random}.pdf`

## Implementation Details

### **1. Package Installation**
```bash
npm install @vercel/blob
```

### **2. Environment Variables**
```bash
# Required for Vercel Blob
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# App URL for production
NEXT_PUBLIC_API_BASE_URL=https://interviewsfirst.com
```

### **3. Database Schema**
The `resumes` table stores Vercel Blob URLs in the `file_url` column:
```sql
-- file_url now contains Vercel Blob URLs instead of local filenames
-- Example: https://blob.vercel-storage.com/resumes/resume-123456.pdf
```

### **4. API Endpoints Updated**

#### **Upload API** (`/api/resumes`)
- Uploads files to Vercel Blob
- Stores blob URL in database
- Maintains local backup in development

#### **Download API** (`/api/resumes/[id]/download`)
- Redirects to Vercel Blob URL for production
- Serves local files in development
- Maintains backward compatibility

#### **Client Registration** (`/api/auth/register-client`)
- Uploads resume files to Vercel Blob during registration
- Stores blob URL in database

## n8n Integration

### **File Download in n8n**
n8n can download files using the HTTP Request node:

```json
{
  "name": "Download Resume",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "={{ $json.resume_data.file_url }}",
    "method": "GET",
    "options": {
      "response": {
        "response": {
          "responseFormat": "file"
        }
      }
    }
  }
}
```

### **URL Structure for n8n**
- **Direct Blob URL**: `https://blob.vercel-storage.com/resumes/resume-123.pdf`
- **API URL**: `https://interviewsfirst.com/api/resumes/123/download`

Both URLs work with n8n, but direct blob URLs are more efficient.

## Migration Process

### **1. Run Migration Script**
```bash
# Set environment variables
export BLOB_READ_WRITE_TOKEN=your_token
export DATABASE_URL=your_database_url

# Run migration
node scripts/migrate-resumes-to-vercel-blob.js
```

### **2. Test File URLs**
```bash
# Test URL structure and n8n compatibility
node scripts/test-file-urls.js
```

## File Flow

### **Upload Flow**
1. User uploads file via API
2. File uploaded to Vercel Blob
3. Blob URL stored in database
4. Local backup created in development

### **Download Flow**
1. User requests file via API
2. API checks if file_url is blob URL or local path
3. If blob URL: redirects to Vercel Blob
4. If local path: serves local file (development only)

### **n8n Processing Flow**
1. n8n receives resume data with file_url
2. n8n downloads file from URL using HTTP Request node
3. n8n processes file (parse, optimize, etc.)
4. n8n returns processed results

## Benefits

### **Vercel Deployment**
- ✅ Files persist across deployments
- ✅ No filesystem limitations
- ✅ Automatic CDN distribution
- ✅ Scalable storage

### **n8n Compatibility**
- ✅ Direct file download from URLs
- ✅ No authentication required for public blobs
- ✅ Reliable file access
- ✅ Standard HTTP requests

### **Development**
- ✅ Local file backup for development
- ✅ Easy testing and debugging
- ✅ Gradual migration support

## Security Considerations

### **Public Access**
- Vercel Blob files are publicly accessible
- URLs are not easily guessable
- Consider adding authentication if needed

### **File Validation**
- File type validation maintained
- File size limits enforced
- Virus scanning recommended for production

## Troubleshooting

### **Common Issues**

1. **BLOB_READ_WRITE_TOKEN not set**
   - Error: `BLOB_READ_WRITE_TOKEN environment variable is required`
   - Solution: Set the token in environment variables

2. **File not found in development**
   - Check if local file exists in `uploads/resumes/`
   - Verify file_url in database

3. **n8n download fails**
   - Check if URL is accessible
   - Verify file permissions
   - Test with curl: `curl -I "https://blob.vercel-storage.com/..."`

### **Debug Commands**

```bash
# Check database file URLs
psql -d your_db -c "SELECT id, name, file_url FROM resumes LIMIT 5;"

# Test file download
curl -I "https://interviewsfirst.com/api/resumes/123/download"

# Test blob URL directly
curl -I "https://blob.vercel-storage.com/resumes/resume-123.pdf"
```

## Performance Considerations

### **File Size Limits**
- Vercel Blob: 4.5GB per file
- Current limit: 10MB (configurable)
- n8n processing: depends on workflow complexity

### **CDN Benefits**
- Global distribution via Vercel CDN
- Faster downloads for n8n workflows
- Reduced server load

## Monitoring

### **Key Metrics**
- Upload success rate
- Download success rate
- n8n processing success rate
- File access patterns

### **Logging**
- Upload operations logged
- Download redirects logged
- Error conditions logged

## Future Enhancements

### **Potential Improvements**
1. **Signed URLs**: Add expiration for security
2. **File Compression**: Optimize file sizes
3. **Virus Scanning**: Add security scanning
4. **Analytics**: Track file usage patterns
5. **Backup**: Implement file backup strategy

## Conclusion

The Vercel Blob implementation provides a robust, scalable solution for resume file storage that works seamlessly with Vercel deployment and n8n workflows. The hybrid approach ensures compatibility across development and production environments while maintaining the existing API structure.
