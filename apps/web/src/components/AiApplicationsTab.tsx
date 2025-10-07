// AI Applications Tab Component
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@interview-me/ui';
import { Button } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { 
  RefreshCw, 
  Settings, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  Loader2,
  Mail,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import { AiApplicationStatus } from '@/lib/services/AiApplyService';
import { apiService } from '@/lib/api';
import EmailModal from './EmailModal';

interface AiApplicationsTabProps {
  clientId: string;
  onApplicationUpdate?: (application: AiApplicationStatus) => void;
}

interface ApplicationStats {
  total: number;
  pending: number;
  processing: number;
  successful: number;
  failed: number;
  awaiting_approval: number;
}

export default function AiApplicationsTab({ clientId, onApplicationUpdate }: AiApplicationsTabProps) {
  const [applications, setApplications] = useState<AiApplicationStatus[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [selectedApplication, setSelectedApplication] = useState<AiApplicationStatus | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState<'compose' | 'reply' | 'forward' | 'review'>('compose');
  const [selectedEmailData, setSelectedEmailData] = useState<any>(null);

  // Fetch applications and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching AI applications for client:', clientId);
      console.log('🔍 API service token:', localStorage.getItem('accessToken'));

      // Fetch applications
      const response = await apiService.get(`/ai-apply/applications/${clientId}`);
      
      console.log('🔍 AI applications response:', response);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const fetchedApplications = (response.data as any)?.applications || [];
      setApplications(fetchedApplications);

      // Calculate stats
      const calculatedStats = calculateStats(fetchedApplications);
      setStats(calculatedStats);

    } catch (err) {
      console.error('❌ Failed to fetch AI applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (apps: AiApplicationStatus[]): ApplicationStats => {
    return {
      total: apps.length,
      pending: apps.filter(app => app.status === 'queued').length,
      processing: apps.filter(app => ['processing', 'email_discovery', 'generating_content'].includes(app.status)).length,
      successful: apps.filter(app => app.status === 'successful').length,
      failed: apps.filter(app => app.status === 'failed').length,
      awaiting_approval: apps.filter(app => app.status === 'awaiting_approval').length
    };
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filters.status !== 'all' && app.status !== filters.status) {
      return false;
    }
    if (filters.search && !app.job_title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !app.company_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Handle application actions
  const handleApprove = async (application: AiApplicationStatus) => {
    try {
      const response = await apiService.post(`/ai-apply/approve`, {
        application_id: application.id
      });

      if (response.success) {
        await fetchData();
        if (onApplicationUpdate) {
          onApplicationUpdate(application);
        }
      } else {
        alert(`Failed to approve: ${response.error}`);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application');
    }
  };

  const handleReject = async (application: AiApplicationStatus) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await apiService.post(`/ai-apply/reject`, {
        application_id: application.id,
        reason
      });

      if (response.success) {
        await fetchData();
        if (onApplicationUpdate) {
          onApplicationUpdate(application);
        }
      } else {
        alert(`Failed to reject: ${response.error}`);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application');
    }
  };

  const handleReview = async (application: AiApplicationStatus) => {
    await handleComposeEmail(application, 'compose');
  };

  const handlePreview = async (application: AiApplicationStatus) => {
    await handleComposeEmail(application, 'review');
  };

  const handleComposeEmail = async (application: AiApplicationStatus, mode: 'compose' | 'review' = 'compose') => {
    console.log('Application data:', application);
    console.log('Target email:', application.target_email);
    console.log('AI content:', application.ai_generated_content);
    
    // Set the selected application for use in handleSendEmail
    setSelectedApplication(application);
    
    const aiContent: any = application.ai_generated_content || {};
    const resumeUrl = aiContent?.resume_content?.blob_url || aiContent?.metadata?.resume_blob_url || '';
    const attachments = resumeUrl
      ? [
          {
            id: 'resume',
            name: `Resume-${application.job_title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
            url: resumeUrl,
            size: 0,
            type: 'application/pdf'
          }
        ]
      : [];

    // Get client's custom email address via API
    let fromEmail = 'worker@interviewsfirst.com';
    try {
      const response = await apiService.get(`/client-emails/${clientId}`);
      if (response.success && response.data && typeof response.data === 'object' && response.data !== null && 'from_email' in response.data) {
        fromEmail = (response.data as any).from_email;
      }
    } catch (error) {
      console.error('Error getting client sender email:', error);
    }

    // Use n8n-generated content if available, otherwise fallback
    // Try target_email first, then fallback to discovery.primary_email from n8n payload
    const discoveredEmail = application.target_email || aiContent?.discovery?.primary_email || '';
    
    const emailData = {
      to: discoveredEmail,
      cc: '',
      bcc: '',
      subject: aiContent?.email_subject || `Application for ${application.job_title} at ${application.company_name}`,
      body: aiContent?.email_body || `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${application.job_title} position at ${application.company_name}...`,
      attachments,
      from: fromEmail
    };
    setSelectedEmailData(emailData);
    setEmailModalMode(mode);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      console.log('Sending email:', emailData);
      
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get the current application ID
      if (!selectedApplication) {
        throw new Error('No application selected');
      }

      // Use the approve API which will send the email and update the status
      const response = await fetch('/api/ai-apply/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          application_id: selectedApplication.id,
          edits: {
            target_email: emailData.to,
            email_subject: emailData.subject,
            email_body: emailData.body,
            worker_notes: `Email sent via worker dashboard on ${new Date().toISOString()}`
          }
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve and send email');
      }

      console.log('Email sent successfully:', result.data);
      alert('Email sent successfully!');
      setIsEmailModalOpen(false);
      
      // Refresh the applications list to show updated status
      await fetchData();
      
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveDraft = async (emailData: any) => {
    // TODO: Implement actual draft saving
    console.log('Saving draft:', emailData);
  };

  // Get status badge
  const getStatusBadge = (status: string, progress: number) => {
    const statusConfig = {
      queued: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Queued' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: 'Processing' },
      email_discovery: { color: 'bg-yellow-100 text-yellow-800', icon: Search, label: 'Finding Email' },
      generating_content: { color: 'bg-purple-100 text-purple-800', icon: Loader2, label: 'Generating Content' },
      awaiting_approval: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Awaiting Approval' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Submitted' },
      successful: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Successful' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
        {progress > 0 && progress < 100 && (
          <span className="ml-1">({progress}%)</span>
        )}
      </Badge>
    );
  };

  // Get action buttons for application
  const getActionButtons = (application: AiApplicationStatus) => {
    switch (application.status) {
      case 'awaiting_approval':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReview(application)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePreview(application)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(application)}
              className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </div>
        );
      case 'successful':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReview(application)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Details
          </Button>
        );
      case 'failed':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReview(application)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Error
          </Button>
        );
      default:
        return null;
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading AI applications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Applications</h3>
          <p className="text-sm text-gray-600">
            Manage AI-powered job applications for this client
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.awaiting_approval}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="email_discovery">Email Discovery</option>
            <option value="generating_content">Generating Content</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="approved">Approved</option>
            <option value="submitted">Submitted</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Applications List */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">
              {applications.length === 0 
                ? 'No AI applications found for this client'
                : 'No applications match the current filters'
              }
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{application.job_title}</h4>
                      {getStatusBadge(application.status, application.progress)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {application.company_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(application.created_at).toLocaleDateString()}</span>
                      {application.target_email && (
                        <span>Target: {application.target_email}</span>
                      )}
                      {application.email_confidence_score && (
                        <span>Confidence: {(application.email_confidence_score * 100).toFixed(0)}%</span>
                      )}
                      {/* Resume link if available */}
                      {(() => {
                        const aiContent: any = application.ai_generated_content || {};
                        const resumeUrl = aiContent?.resume_content?.blob_url || aiContent?.metadata?.resume_blob_url;
                        if (!resumeUrl) return null;
                        return (
                          <a
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View resume
                          </a>
                        );
                      })()}
                    </div>
                    {application.error_message && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {application.error_message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getActionButtons(application)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}



      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        initialData={selectedEmailData || undefined}
        mode={emailModalMode}
        readOnly={false}
      />
    </div>
  );
}
