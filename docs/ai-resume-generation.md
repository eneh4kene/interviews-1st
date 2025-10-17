# AI Resume Generation System

## Overview

The AI Resume Generation system allows workers to generate custom resumes tailored specifically for job applications. This system integrates seamlessly with the existing manual application flow, providing an optional AI-powered resume generation step before proceeding to external job applications.

## Architecture

### Core Components

1. **AiResumeService** - Handles resume generation business logic
2. **AiResumeN8nBridge** - Bridges the application with n8n workflows
3. **ResumeGenerationModal** - Frontend modal for user interaction
4. **API Endpoints** - RESTful API for resume generation operations

### Database Schema

The system uses a new table `ai_resume_generations` to track resume generation requests:

```sql
CREATE TABLE ai_resume_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_website VARCHAR(255),
  description_snippet TEXT,
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'generating', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  original_resume_id UUID REFERENCES resumes(id),
  original_resume_url TEXT,
  generated_resume_url TEXT,
  generated_resume_filename VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## User Flow

### Manual Application with Resume Generation

1. **User clicks "Manual Apply"** on any job in Job Discovery
2. **Modal appears** asking: "Generate custom resume for this job?"
3. **User chooses:**
   - **"Yes, Generate Resume"** → AI generates custom resume → Download + Continue to job
   - **"No, Continue with My Resume"** → Direct to job application
4. **Seamless continuation** to external job application

### Status Flow

```
queued → processing → generating → completed
   ↓
failed (at any stage)
```

## API Endpoints

### Resume Generation

- `POST /api/ai-resume/submit` - Submit resume generation request
- `GET /api/ai-resume/status/[id]` - Get resume generation status
- `GET /api/ai-resume/generations/[clientId]` - Get resume generations for client

### n8n Integration

- `POST /api/n8n/ai-resume` - n8n webhook callback for resume generation results

## n8n Workflow Integration

### Webhook URL
```
POST /api/n8n/ai-resume
```

### Input Payload
```json
{
  "resume_id": "uuid",
  "client_id": "uuid",
  "client_name": "string",
  "sender_email": "string",
  "worker_id": "uuid",
  "resume": {
    "id": "uuid",
    "file_url": "string",
    "name": "string"
  },
  "job_id": "string",
  "job_title": "string",
  "company_name": "string",
  "company_website": "string",
  "description_snippet": "string"
}
```

### Success Response
```json
{
  "status": "success",
  "resume_id": "uuid",
  "client_id": "uuid",
  "job_id": "string",
  "generated_resume": {
    "resume_url": "string",
    "filename": "string",
    "file_size": "number"
  },
  "metadata": {}
}
```

### Error Response
```json
{
  "status": "error",
  "resume_id": "uuid",
  "client_id": "uuid",
  "job_id": "string",
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Environment Variables

Add these to your `.env` file:

```env
# n8n Integration
N8N_BASE_URL=http://localhost:5678
N8N_AI_RESUME_WEBHOOK_PATH=/webhook-test/ai-resume
N8N_WEBHOOK_SECRET=your_webhook_secret
```

## Frontend Components

### ResumeGenerationModal

A modal component that handles the resume generation flow:

- **Props:**
  - `isOpen: boolean` - Modal visibility
  - `onClose: () => void` - Close handler
  - `job: JobListing` - Job details
  - `clientId: string` - Client ID
  - `defaultResume: Resume` - Default resume to use
  - `onContinue: () => void` - Continue to job handler
  - `onResumeGenerated?: (url: string) => void` - Resume generated callback

- **States:**
  - `idle` - Initial state, asking user for confirmation
  - `generating` - Resume generation in progress
  - `completed` - Resume generated successfully
  - `failed` - Resume generation failed

### JobDiscoveryTab Integration

The JobDiscoveryTab has been updated to:

- Show resume generation modal when "Manual Apply" is clicked
- Handle the resume generation flow
- Continue to job application after resume generation or skipping

## Testing

### Manual Testing

1. Navigate to a client's Job Discovery tab
2. Click "Manual Apply" on any job
3. Choose "Yes, Generate Resume" in the modal
4. Wait for resume generation to complete
5. Download the generated resume
6. Click "Continue to Job" to proceed

### API Testing

Test the service endpoint:
```bash
curl http://localhost:3000/api/test-ai-resume
```

## Security

- All API endpoints require JWT authentication
- Workers can only access their own resume generations
- Admins can access all resume generations
- Webhook endpoints verify secret tokens

## Performance

- Resume generation is processed asynchronously via n8n
- Frontend polls for status updates every 10 seconds
- Maximum polling time of 5 minutes
- Database queries are optimized with proper indexing

## Error Handling

- Comprehensive error handling at all levels
- User-friendly error messages in the UI
- Automatic retry mechanism for failed generations
- Graceful fallback to manual application if resume generation fails

## Future Enhancements

- Real-time WebSocket updates for status changes
- Resume generation analytics and metrics
- Bulk resume generation for multiple jobs
- Custom resume templates per client
- Integration with external resume optimization services
