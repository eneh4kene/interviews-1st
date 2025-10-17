'use client';

import React, { useState } from 'react';
import { Button } from '@interview-me/ui';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Download,
  FileText,
  Clock
} from 'lucide-react';
import { apiService } from '@/lib/api';

interface JobListing {
  id: string;
  title: string;
  company: string;
  company_website?: string;
  description: string;
  external_url?: string;
}

interface ResumeGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing;
  clientId: string;
  defaultResume: { id: string; file_url: string; name: string };
  onContinue: () => void;
  onResumeGenerated?: (resumeUrl: string) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed';

export default function ResumeGenerationModal({
  isOpen,
  onClose,
  job,
  clientId,
  defaultResume,
  onContinue,
  onResumeGenerated
}: ResumeGenerationModalProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [generatedResumeUrl, setGeneratedResumeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const handleGenerateResume = async () => {
    setStatus('generating');
    setError(null);
    
    console.log('🚀 Starting resume generation...');
    console.log('📋 Payload:', {
      client_id: clientId,
      job_id: job.id,
      job_title: job.title,
      company_name: job.company,
      company_website: job.company_website,
      description_snippet: job.description,
      resume: defaultResume
    });
    
    try {
      const response = await apiService.post('/ai-resume/submit', {
        client_id: clientId,
        job_id: job.id,
        job_title: job.title,
        company_name: job.company,
        company_website: job.company_website,
        description_snippet: job.description,
        resume: defaultResume
      });

      console.log('📡 API Response:', response);

      if (response.success) {
        setResumeId(response.data.resume_id);
        // Poll for completion
        await pollForCompletion(response.data.resume_id);
      } else {
        throw new Error(response.error || 'Failed to start resume generation');
      }
    } catch (err) {
      console.error('Error generating resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate resume');
      setStatus('failed');
    }
  };

  const pollForCompletion = async (resumeId: string) => {
    const maxAttempts = 30; // 5 minutes max (10 seconds * 30)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const statusResponse = await apiService.get(`/ai-resume/status/${resumeId}`);
        
        if (statusResponse.success) {
          const data = statusResponse.data;
          
          if (data.status === 'completed') {
            setGeneratedResumeUrl(data.generated_resume_url);
            setStatus('completed');
            if (onResumeGenerated) {
              onResumeGenerated(data.generated_resume_url);
            }
            break;
          } else if (data.status === 'failed') {
            setError(data.error_message || 'Resume generation failed');
            setStatus('failed');
            break;
          }
          // Continue polling for 'queued', 'processing', 'generating' statuses
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
      } catch (pollError) {
        console.error('Error polling resume status:', pollError);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }
    
    // If we've exhausted attempts without completion
    if (attempts >= maxAttempts && status === 'generating') {
      setError('Resume generation is taking longer than expected. Please try again later.');
      setStatus('failed');
    }
  };

  const handleDownload = () => {
    if (generatedResumeUrl) {
      window.open(generatedResumeUrl, '_blank');
    }
  };

  const handleContinue = () => {
    onContinue();
    // Reset modal state
    setStatus('idle');
    setGeneratedResumeUrl(null);
    setError(null);
    setResumeId(null);
  };

  const handleClose = () => {
    onClose();
    // Reset modal state
    setStatus('idle');
    setGeneratedResumeUrl(null);
    setError(null);
    setResumeId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Generate Custom Resume
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Job Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900">{job.title}</h4>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>

          {/* Content based on status */}
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-gray-700">
                    We can generate a custom resume tailored specifically for this job at <strong>{job.company}</strong>. 
                    This will highlight relevant skills and experience for better success.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleGenerateResume} 
                  className="flex-1"
                  disabled={!defaultResume}
                >
                  Yes, Generate Resume
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleContinue} 
                  className="flex-1"
                >
                  No, Continue with My Resume
                </Button>
              </div>
              
              {!defaultResume && (
                <p className="text-sm text-red-600">
                  Please upload a resume for this client before generating a custom one.
                </p>
              )}
            </div>
          )}

          {status === 'generating' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-700 font-medium">Generating custom resume...</p>
              <p className="text-sm text-gray-500 mt-2">
                This usually takes 1-2 minutes
              </p>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          )}

          {status === 'completed' && generatedResumeUrl && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-green-600 font-medium">Resume generated successfully!</p>
                <p className="text-sm text-gray-600 mt-1">
                  Your custom resume is ready for download.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={handleContinue} 
                  className="flex-1"
                >
                  Continue to Job
                </Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">Resume generation failed</p>
                <p className="text-sm text-gray-600 mt-1">
                  {error || 'An unexpected error occurred. Please try again.'}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleGenerateResume} 
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={handleContinue} 
                  className="flex-1"
                >
                  Continue to Job
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
