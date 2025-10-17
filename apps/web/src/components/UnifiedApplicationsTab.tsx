'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@interview-me/ui';
import { Button } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { 
  RefreshCw, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  ExternalLink,
  FileText,
  Bot,
  User,
  Loader2,
  Mail,
  Paperclip
} from 'lucide-react';
import { apiService } from '@/lib/api';

interface UnifiedApplication {
  id: string;
  client_id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  company_website?: string;
  application_type: 'ai' | 'manual';
  created_at: string;
  updated_at: string;
  
  // AI Application fields
  status?: string;
  progress?: number;
  wait_for_approval?: boolean;
  retry_count?: number;
  max_retries?: number;
  error_message?: string;
  ai_generated_content?: any;
  worker_notes?: string;
  target_email?: string;
  email_confidence_score?: number;
  alternative_emails?: string[];
  
  // Manual Application fields
  apply_url?: string;
  resume_id?: string;
  notes?: string;
  application_date?: string;
  interview_date?: string;
  
  // Resume Generation fields
  resume_generation_status?: string;
  resume_generation_progress?: number;
  generated_resume_url?: string;
  generated_resume_filename?: string;
  resume_generation_error?: string;
  resume_generation_retry_count?: number;
  resume_generation_max_retries?: number;
}

interface ApplicationStats {
  total: number;
  ai_applications: number;
  manual_applications: number;
  resume_generation_pending: number;
  resume_generation_completed: number;
  resume_generation_failed: number;
}

interface UnifiedApplicationsTabProps {
  clientId: string;
}

export default function UnifiedApplicationsTab({ clientId }: UnifiedApplicationsTabProps) {
  const [applications, setApplications] = useState<UnifiedApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'ai', 'manual'
    status: 'all', // 'all', 'pending', 'completed', 'failed'
    search: ''
  });

  // Fetch applications and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching unified applications for client:', clientId);

      const response = await apiService.get(`/applications/unified/${clientId}`);
      
      console.log('🔍 Unified applications response:', response);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const data = response.data as any;
      setApplications(data.applications || []);
      setStats(data.stats || null);

    } catch (err) {
      console.error('❌ Failed to fetch unified applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    // Type filter
    if (filters.type !== 'all' && app.application_type !== filters.type) {
      return false;
    }

    // Status filter
    if (filters.status !== 'all') {
      if (app.application_type === 'ai') {
        if (filters.status === 'pending' && !['queued', 'processing', 'email_discovery', 'generating_content', 'awaiting_approval'].includes(app.status || '')) {
          return false;
        }
        if (filters.status === 'completed' && !['approved', 'submitted', 'successful'].includes(app.status || '')) {
          return false;
        }
        if (filters.status === 'failed' && app.status !== 'failed') {
          return false;
        }
      } else if (app.application_type === 'manual') {
        if (filters.status === 'pending' && !['queued', 'processing', 'generating'].includes(app.resume_generation_status || '')) {
          return false;
        }
        if (filters.status === 'completed' && app.resume_generation_status !== 'completed') {
          return false;
        }
        if (filters.status === 'failed' && app.resume_generation_status !== 'failed') {
          return false;
        }
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        app.job_title.toLowerCase().includes(searchLower) ||
        app.company_name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Get status badge for AI applications
  const getAiStatusBadge = (status: string, progress: number) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
      case 'processing':
      case 'email_discovery':
      case 'generating_content':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing ({progress}%)</Badge>;
      case 'awaiting_approval':
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Awaiting Approval</Badge>;
      case 'approved':
      case 'submitted':
      case 'successful':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get status badge for manual applications
  const getManualStatusBadge = (app: UnifiedApplication) => {
    if (app.resume_generation_status) {
      switch (app.resume_generation_status) {
        case 'queued':
          return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Resume Queued</Badge>;
        case 'processing':
        case 'generating':
          return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating Resume ({app.resume_generation_progress || 0}%)</Badge>;
        case 'completed':
          return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Resume Ready</Badge>;
        case 'failed':
          return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Resume Failed</Badge>;
        default:
          return <Badge variant="secondary">{app.resume_generation_status}</Badge>;
      }
    }
    
    // No resume generation, just show application status
    return <Badge variant="outline"><User className="h-3 w-3 mr-1" />Applied</Badge>;
  };

  // Get application type badge
  const getTypeBadge = (type: string) => {
    if (type === 'ai') {
      return <Badge variant="default"><Bot className="h-3 w-3 mr-1" />AI Apply</Badge>;
    } else {
      return <Badge variant="outline"><User className="h-3 w-3 mr-1" />Manual</Badge>;
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Applications</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Applications</h2>
          <p className="text-gray-600">Track all your job applications in one place</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">AI Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ai_applications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Manual Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.manual_applications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Paperclip className="h-8 w-8 text-orange-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Resumes Generated</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.resume_generation_completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Types</option>
                <option value="ai">AI Applications</option>
                <option value="manual">Manual Applications</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search applications..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-600">
              {applications.length === 0 
                ? "You haven't submitted any applications yet."
                : "No applications match your current filters."
              }
            </p>
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
                      {getTypeBadge(application.application_type)}
                      {application.application_type === 'ai' 
                        ? getAiStatusBadge(application.status || '', application.progress || 0)
                        : getManualStatusBadge(application)
                      }
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {application.company_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(application.created_at).toLocaleDateString()}</span>
                      {application.application_type === 'ai' && application.target_email && (
                        <span>Target: {application.target_email}</span>
                      )}
                      {application.application_type === 'manual' && application.apply_url && (
                        <span>Applied: {new Date(application.application_date || application.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Download generated resume */}
                    {application.application_type === 'manual' && application.generated_resume_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(application.generated_resume_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    
                    {/* View AI application details */}
                    {application.application_type === 'ai' && application.ai_generated_content && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // TODO: Open AI application details modal
                          console.log('View AI application details:', application.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    
                    {/* Open job URL */}
                    {application.apply_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(application.apply_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Job
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Error messages */}
                {application.error_message && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{application.error_message}</p>
                  </div>
                )}
                
                {application.resume_generation_error && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">Resume Generation Error: {application.resume_generation_error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
